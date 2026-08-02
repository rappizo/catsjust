/**
 * 只有猫 · Supabase 连通性冒烟测试
 * 用法：node scripts/supabase-smoke.mjs
 * 验证：publishable 密钥能否连通 API、RLS 查询是否正常
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// 加载 .env.local（兼容 CRLF）
for (const rawLine of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = rawLine.trimEnd().match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

console.log('URL        :', url);
console.log('Publishable:', publishable ? publishable.slice(0, 16) + '…' : '(未填)');
console.log('Secret     :', secret ? secret.slice(0, 16) + '…' : '(未填)');

// 1. 匿名(publishable)客户端：走 RLS
const anon = createClient(url, publishable);
const { data: topics, error: tErr } = await anon.from('topics').select('name, slug').order('sort_order');
console.log('\n[匿名] 话题查询:', tErr ? `❌ ${tErr.message}` : `✅ ${topics.length} 条 → ${topics.map((t) => t.name).join('、')}`);

const { data: notes, error: nErr } = await anon.from('notes').select('id').limit(1);
console.log('[匿名] 笔记查询:', nErr ? `❌ ${nErr.message}` : `✅ ${notes.length} 条`);

// 2. 服务端(secret)客户端：走管理员通道
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: users, error: uErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 3 });
console.log('[secret] 用户列表:', uErr ? `❌ ${uErr.message}` : `✅ 共 ${users.total} 个用户`);

console.log('\n冒烟测试完成。');
