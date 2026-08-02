// 查询/修改 Supabase auth 邮箱确认配置
// 用法：node scripts/auth-config.mjs [query|disable-confirm|list]
import fs from 'node:fs';
import pg from 'pg';

const env = {};
fs.readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?\s*$/);
    if (m) env[m[1]] = m[2];
  });

const action = process.argv[2] || 'query';
const dbUrl = env.SUPABASE_DB_URL || env.SUPABASE_DB_POOLER_URL;
if (!dbUrl) {
  console.error('missing SUPABASE_DB_URL');
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

if (action === 'list') {
  const { rows } = await client.query(
    "select table_name from information_schema.tables where table_schema = 'auth' order by table_name"
  );
  console.log('auth tables:', rows.map((r) => r.table_name).join(', '));
} else if (action === 'disable-confirm') {
  const { rows } = await client.query(
    'update auth.config set mailer_autoconfirm = true returning id, mailer_autoconfirm'
  );
  console.log('updated auth.config ->', JSON.stringify(rows[0]));
} else {
  const { rows } = await client.query(
    'select id, mailer_autoconfirm from auth.config'
  );
  console.log('auth.config ->', JSON.stringify(rows[0]));
}

await client.end();

