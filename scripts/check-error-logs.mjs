// 临时：查询 error_logs 表，查看 App 上报的崩溃日志
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?\s*$/);
    if (m) env[m[1]] = m[2];
  });

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

const { data, error } = await sb
  .from('error_logs')
  .select('id,message,stack,url,user_agent,created_at')
  .order('created_at', { ascending: false })
  .limit(20);

if (error) {
  console.log('查询错误:', error.message);
  process.exit(0);
}
if (!data.length) {
  console.log('error_logs 表为空（App 没有上报记录）');
  process.exit(0);
}
data.forEach((r) => {
  console.log('---');
  console.log('time:', r.created_at, '| url:', r.url, '| ua:', r.user_agent);
  console.log('msg:', r.message);
  if (r.stack) console.log('stack:', r.stack.slice(0, 800));
});
