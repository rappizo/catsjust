// 删除测试账号及其关联内容
// 用法：node scripts/delete-test-users.mjs            # dry-run 预览
//       node scripts/delete-test-users.mjs --apply    # 实际删除
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).forEach((line) => {
  const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);
const APPLY = process.argv.includes('--apply');
const log = (msg) => console.log((APPLY ? '[执行] ' : '[预览] ') + msg);

// 测试账号（带 test/tester 的邮箱）
const TEST_IDS = [
  '97b271ab-05d8-4cef-a76f-33ef171e17a4', // l1test@catsjust.local
  '38fc2279-0dac-46bf-b143-ce748255fc4d', // l2test@catsjust.local
  '30143ca0-1fa4-4d4b-a381-f6fb7ab31d17', // test@catsjust.com（测试铲屎官）
  '94025a1e-be82-4953-8dd9-5d4992ed58ab', // ar.tester
  'fc5986e3-e40c-4a7b-aa5a-e1b966b7e5ad', // en.tester
];
const uid = `(${TEST_IDS.map((i) => `'${i}'`).join(',')})`;

// 测试账号的笔记 & 猫咪
const { data: testNotes } = await sb.from('notes').select('id, media, author_id').in('author_id', TEST_IDS);
const noteIds = (testNotes ?? []).map((n) => n.id);
const nid = noteIds.length ? `(${noteIds.map((i) => `'${i}'`).join(',')})` : null;
const { data: testCats } = await sb.from('cats').select('id, avatar_url').in('owner_id', TEST_IDS);
const catIds = (testCats ?? []).map((c) => c.id);
const { data: testConvA } = await sb.from('conversations').select('id').in('user_a', TEST_IDS);
const { data: testConvB } = await sb.from('conversations').select('id').in('user_b', TEST_IDS);
const convIds = [...(testConvA ?? []), ...(testConvB ?? [])].map((c) => c.id);

log(`测试账号: ${TEST_IDS.length} 个`);
log(`测试笔记: ${noteIds.length} 个 ${noteIds.map((i) => i.slice(0, 8)).join(',')}`);
log(`测试猫咪: ${catIds.length} 个`);
log(`测试对话: ${convIds.length} 个`);

// 统计需要清理的关联数据
for (const [tbl, col] of [
  ['not_interested', 'note_id'],
  ['likes', 'note_id'],
  ['comments', 'note_id'],
]) {
  if (!nid) { log(`${tbl}（关联测试笔记）: 0`); continue; }
  const { count } = await sb.from(tbl).select('*', { count: 'exact', head: true }).in(col, noteIds);
  log(`${tbl}（关联测试笔记）: ${count}`);
}
for (const [tbl, col] of [
  ['follows', 'follower_id'],
  ['not_interested', 'user_id'],
  ['likes', 'user_id'],
  ['comments', 'user_id'],
]) {
  const { count } = await sb.from(tbl).select('*', { count: 'exact', head: true }).in(col, TEST_IDS);
  log(`${tbl}（测试用户发起/归属）: ${count}`);
}
if (convIds.length) {
  const { count } = await sb.from('messages').select('*', { count: 'exact', head: true }).in('conversation_id', convIds);
  log(`messages（测试对话内）: ${count}`);
}
// favorites 表是否存在
let favTable = false;
try {
  const { count } = await sb.from('favorites').select('*', { count: 'exact', head: true }).limit(1);
  favTable = true;
  const c1 = nid ? (await sb.from('favorites').select('*', { count: 'exact', head: true }).in('note_id', noteIds)).count : 0;
  const c2 = (await sb.from('favorites').select('*', { count: 'exact', head: true }).in('user_id', TEST_IDS)).count;
  log(`favorites（关联测试）: ${c1 + c2}`);
} catch { log('favorites 表不存在'); }

// Storage 文件统计
let storageFiles = 0;
try {
  const { data: items } = await sb.storage.from('media').list('', { limit: 1000 });
  for (const it of items ?? []) {
    if (it.id && TEST_IDS.includes(it.id)) {
      const { data: files } = await sb.storage.from('media').list(it.name, { limit: 1000 });
      storageFiles += (files ?? []).filter((f) => f.id).length;
    }
  }
  log(`Storage media/${TEST_IDS.length} 个目录下的文件: ${storageFiles}`);
} catch (e) { log(`Storage 统计失败: ${e.message}`); }

if (!APPLY) {
  console.log('\n以上为预览。确认无误后加 --apply 执行。');
  process.exit(0);
}

// ============ 实际删除 ============
if (nid) {
  for (const [tbl, col] of [['not_interested', 'note_id'], ['likes', 'note_id'], ['comments', 'note_id']]) {
    const { error } = await sb.from(tbl).delete().in(col, noteIds);
    if (error) log(`${tbl} 删除失败: ${error.message}`);
  }
  if (favTable) {
    const { error } = await sb.from('favorites').delete().in('note_id', noteIds);
    if (error) log(`favorites 删除失败: ${error.message}`);
  }
}
for (const [tbl, col] of [
  ['follows', 'follower_id'],
  ['follows', 'following_id'],
  ['not_interested', 'user_id'],
  ['likes', 'user_id'],
  ['comments', 'user_id'],
]) {
  const { error } = await sb.from(tbl).delete().in(col, TEST_IDS);
  if (error) log(`${tbl}.${col} 删除失败: ${error.message}`);
}
if (convIds.length) {
  const { error } = await sb.from('messages').delete().in('conversation_id', convIds);
  if (error) log(`messages 删除失败: ${error.message}`);
  const { error: e2 } = await sb.from('conversations').delete().in('id', convIds);
  if (e2) log(`conversations 删除失败: ${e2.message}`);
}
// 删除测试用户的笔记（含草稿）
if (noteIds.length) {
  const { error } = await sb.from('notes').delete().in('id', noteIds);
  if (error) log(`notes 删除失败: ${error.message}`);
}
// 删除测试用户的猫咪
if (catIds.length) {
  const { error } = await sb.from('cats').delete().in('id', catIds);
  if (error) log(`cats 删除失败: ${error.message}`);
}
// 删除 profiles
const { error: pe } = await sb.from('profiles').delete().in('id', TEST_IDS);
if (pe) log(`profiles 删除失败: ${pe.message}`);
// 删除 Storage 文件（按用户目录前缀）
try {
  const { data: items } = await sb.storage.from('media').list('', { limit: 1000 });
  for (const it of items ?? []) {
    if (it.id && TEST_IDS.includes(it.id)) {
      const { data: files } = await sb.storage.from('media').list(it.name, { limit: 1000 });
      const paths = (files ?? []).filter((f) => f.id).map((f) => `${it.name}/${f.name}`);
      for (const p of paths) {
        const { error } = await sb.storage.from('media').remove([p]);
        if (error) log(`storage 删除 ${p} 失败: ${error.message}`);
      }
      log(`storage 删除目录 ${it.name} 下 ${paths.length} 个文件`);
    }
  }
} catch (e) { log(`storage 删除异常: ${e.message}`); }
// 删除 auth.users（最后）
for (const id of TEST_IDS) {
  const { error } = await sb.auth.admin.deleteUser(id);
  if (error) log(`auth 删除 ${id} 失败: ${error.message}`);
}
log('完成');
