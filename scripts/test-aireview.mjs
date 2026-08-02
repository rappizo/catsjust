/**
 * 测试 AI 自动审核（gpt-5.5 视觉）在几类内容上的判定
 * 用法：node scripts/test-aireview.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { aiReviewNote } from '../src/lib/ai/review.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const rawLine of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = rawLine.trimEnd().match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

// 取已发布笔记的封面图作为真实图片样本
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data } = await admin.from('notes').select('cover_url, title, content, media_type').eq('status', 'published').limit(1);
const note = data?.[0];

const cases = [
  {
    name: '正常猫咪笔记（真实照片样本）',
    title: note?.title || '我家猫',
    content: note?.content || '今天带我家猫去公园晒太阳',
    imageUrl: note?.cover_url ?? null,
    mediaType: 'image',
  },
  {
    name: '与猫无关的风景',
    title: '海边日落',
    content: '今天去海边看日落，好美',
    imageUrl: note?.cover_url ?? null,
    mediaType: 'image',
  },
  {
    name: '广告文案',
    title: '我家猫在用的猫粮',
    content: '强烈推荐 XX 牌猫粮，现在下单立减 50 元，加微信 12345 购买',
    imageUrl: note?.cover_url ?? null,
    mediaType: 'image',
  },
];

for (const c of cases) {
  console.log(`\n▶ ${c.name}`);
  const r = await aiReviewNote(c);
  console.log(`  判定: ${r.verdict} | 原因: ${r.reason}`);
}
