/**
 * 只有猫 · 种子内容生成脚本
 * 通过 apiyi 图片 API 生成 3 张不同的猫图，
 * 创建 3 个账号，并为每个账号发布一篇对应品种的笔记（直接 published）。
 *
 * 用法：node scripts/seed-cats.mjs
 * 依赖：.env.local 中的 APIYI_* / SUPABASE_* 配置
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ---------- 加载 .env.local（兼容 CRLF 与引号） ----------
for (const rawLine of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = rawLine.trimEnd().match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  APIYI_BASE_URL,
  APIYI_API_KEY,
  AI_IMAGE_MODEL,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !APIYI_BASE_URL || !APIYI_API_KEY || !AI_IMAGE_MODEL) {
  console.error('❌ .env.local 缺少必要配置（Supabase / APIYI）');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- 3 个账号 / 猫 / 帖子 ----------
const SEEDS = [
  {
    nickname: '布偶控小美',
    email: 'ragdoll.lover@catsjust.com',
    password: 'Miaodao2026!',
    cat: { name: '雪球', breed: '布偶猫', gender: 'female', personality: ['粘人', '温柔'], bio: '一只安静优雅的布偶猫' },
    topicSlug: 'daily',
    title: '我家雪球的日常',
    content: '布偶猫的温柔与玻璃心都在这啦～阳光下的小仙女，谁不爱呢？',
    prompt: 'A beautiful Ragdoll cat with blue eyes and fluffy white and grey fur sitting on a windowsill with soft sunlight, photorealistic, high detail, 4k',
  },
  {
    nickname: '橘座驾到',
    email: 'orange.tabby@catsjust.com',
    password: 'Miaodao2026!',
    cat: { name: '大橘', breed: '橘猫', gender: 'male', personality: ['吃货', '活泼'], bio: '十只橘猫九只胖，还有一只特别胖' },
    topicSlug: 'funny',
    title: '大橘为重',
    content: '橘猫的体重就是尊严！躺平晒太阳的快乐，你们不懂～',
    prompt: 'A chubby orange tabby cat lounging lazily in the sun on a sofa, cozy warm lighting, photorealistic, high detail, 4k',
  },
  {
    nickname: '蓝胖子铲屎官',
    email: 'british.shorthair@catsjust.com',
    password: 'Miaodao2026!',
    cat: { name: '蓝胖子', breed: '英国短毛猫', gender: 'male', personality: ['高冷', '慵懒'], bio: '脸圆圆，心热热' },
    topicSlug: 'beauty',
    title: '蓝胖子の凝视',
    content: '英国短毛猫的圆脸谁能不爱？一张高级感十足的喵生照。',
    prompt: 'A cute British Shorthair blue-grey cat with round face and amber eyes, studio portrait, soft lighting, photorealistic, high detail, 4k',
  },
];

// ---------- apiyi 生成图片 ----------
async function generateImage(prompt) {
  console.log(`  🎨 生成图片中（${AI_IMAGE_MODEL}）…`);
  const res = await fetch(`${APIYI_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${APIYI_API_KEY}` },
    body: JSON.stringify({
      model: AI_IMAGE_MODEL,
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`图片生成失败 HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error('图片响应缺少 b64_json');
  return Buffer.from(b64, 'base64');
}

// ---------- 上传到 Supabase Storage ----------
async function uploadImage(userId, buffer) {
  const path = `${userId}/images/${randomUUID()}.png`;
  const { error } = await admin.storage
    .from('media')
    .upload(path, buffer, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(`上传失败: ${error.message}`);
  const { data } = admin.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

// ---------- 幂等清理：删除已存在的种子用户与孤儿文件 ----------
async function cleanup() {
  console.log('🧹 清理旧数据…');
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const seedEmails = new Set(SEEDS.map((s) => s.email));
  for (const u of users?.users ?? []) {
    if (seedEmails.has(u.email) || u.email.startsWith('probe')) {
      await admin.auth.admin.deleteUser(u.id);
      console.log(`  🗑️ 用户 ${u.email} 已删除`);
    }
  }
  // 删除历史失败的孤儿图片（undefined 路径）
  const { data: objs } = await admin.storage.from('media').list('undefined', { limit: 100 });
  if (objs?.length) {
    await admin.storage.from('media').remove(objs.map((o) => `undefined/${o.name}`));
    console.log(`  🗑️ 清理孤儿图片 ${objs.length} 个`);
  }
}

// ---------- 主流程 ----------
async function main() {
  console.log('===== 只有猫 · 种子内容生成 =====\n');
  await cleanup();
  const results = [];

  for (const [i, seed] of SEEDS.entries()) {
    console.log(`[${i + 1}/${SEEDS.length}] ${seed.nickname}（${seed.email}）`);
    try {
      // 1. 生成图片
      const imgBuffer = await generateImage(seed.prompt);

      // 2. 创建用户（email_confirm 直接验证，触发器自动建 profiles）
      const { data: created, error: uErr } = await admin.auth.admin.createUser({
        email: seed.email,
        password: seed.password,
        email_confirm: true,
        user_metadata: { nickname: seed.nickname },
      });
      if (uErr) throw new Error(`创建用户失败: ${uErr.message}`);
      const userId = created.user.id;
      const userEmail = created.user.email;
      console.log(`  ✅ 用户创建: ${userEmail}`);

      // 3. 上传图片
      const coverUrl = await uploadImage(userId, imgBuffer);
      console.log(`  ✅ 图片上传: ${coverUrl.slice(0, 80)}…`);

      // 4. 创建猫咪档案
      const { data: cat, error: cErr } = await admin
        .from('cats')
        .insert({
          owner_id: userId,
          name: seed.cat.name,
          breed: seed.cat.breed,
          gender: seed.cat.gender,
          personality_tags: seed.cat.personality,
          bio: seed.cat.bio,
          avatar_url: coverUrl,
        })
        .select('id')
        .single();
      if (cErr) throw new Error(`创建猫咪失败: ${cErr.message}`);
      console.log(`  ✅ 猫咪档案: ${seed.cat.name}（${seed.cat.breed}）`);

      // 5. 查话题
      const { data: topic } = await admin
        .from('topics')
        .select('id')
        .eq('slug', seed.topicSlug)
        .maybeSingle();

      // 6. 发布笔记（直接 published）
      const { error: nErr } = await admin.from('notes').insert({
        author_id: userId,
        cat_id: cat.id,
        topic_id: topic?.id ?? null,
        title: seed.title,
        content: seed.content,
        media: [{ url: coverUrl, type: 'image' }],
        cover_url: coverUrl,
        media_type: 'image',
        status: 'published',
      });
      if (nErr) throw new Error(`发布笔记失败: ${nErr.message}`);
      console.log(`  ✅ 笔记发布: ${seed.title}`);

      results.push({ nickname: seed.nickname, email: seed.email, cat: seed.cat.name, breed: seed.cat.breed, title: seed.title });
    } catch (e) {
      console.error(`  ❌ ${e.message}`);
    }
    console.log('');
  }

  console.log('===== 完成 =====');
  console.log(`成功 ${results.length}/${SEEDS.length}`);
  for (const r of results) {
    console.log(` - ${r.nickname} <${r.email}> · ${r.cat}(${r.breed}) ·《${r.title}》`);
  }
  console.log('\n统一测试密码: Miaodao2026!');
}

main().catch((e) => {
  console.error('❌ 脚本异常:', e);
  process.exit(1);
});
