// 一次性脚本：应用 0003 语言列迁移（幂等）
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// 读取 .env.local（CRLF 兼容）
const envRaw = readFileSync(join(root, '.env.local'), 'utf8');
const env = {};
for (const line of envRaw.split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const url = env.DIRECT_URL || env.SUPABASE_DB_URL;
if (!url) {
  console.error('❌ 未找到数据库连接串（DIRECT_URL / SUPABASE_DB_URL）');
  process.exit(1);
}

const sql = readFileSync(join(root, 'supabase', 'migrations', '0003_user_language.sql'), 'utf8');
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log('✅ 0003_user_language.sql 已执行');
  const r = await client.query(
    "select column_name, data_type, column_default from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='language'"
  );
  console.log('language 列:', JSON.stringify(r.rows[0] || null));
} catch (e) {
  console.error('❌ 执行失败:', e.message);
  process.exit(1);
} finally {
  await client.end();
}
