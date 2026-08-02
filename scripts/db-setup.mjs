/**
 * 只有猫 · 数据库配置与迁移脚本
 * 用法：node scripts/db-setup.mjs
 * 功能：
 *   1. 测试直连(5432)与连接池(6543)连通性
 *   2. 执行 supabase/migrations 下的迁移
 *   3. 校验表结构与种子数据
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ---------- 加载 .env.local ----------
function loadEnv() {
  const content = readFileSync(join(root, '.env.local'), 'utf8');
  // 兼容 Windows CRLF 换行：先按行拆分并去掉行尾 \r
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}
loadEnv();

const configs = {
  direct: { url: process.env.SUPABASE_DB_URL, port: 5432, label: '直连 5432' },
  pooler: { url: process.env.SUPABASE_DB_POOLER_URL, port: 6543, label: '连接池 6543' },
};

const clientOpts = (url) => ({ connectionString: url, ssl: { rejectUnauthorized: false } });

// ---------- 1. 连通性测试 ----------
async function testConnections() {
  console.log('===== 1. 连通性测试 =====');
  for (const [name, cfg] of Object.entries(configs)) {
    const client = new pg.Client(clientOpts(cfg.url));
    try {
      await client.connect();
      const res = await client.query(
        `select current_database() as db, current_user as usr, current_setting('server_version') as ver`
      );
      console.log(
        `✅ [${cfg.label}] 连接成功 -> 数据库=${res.rows[0].db} 用户=${res.rows[0].usr} PG=${res.rows[0].ver}`
      );
    } catch (e) {
      console.error(`❌ [${cfg.label}] 连接失败: ${e.message}`);
      process.exitCode = 1;
    } finally {
      await client.end().catch(() => {});
    }
  }
}

// ---------- 2. 执行迁移 ----------
async function runMigrations() {
  console.log('\n===== 2. 执行迁移 =====');
  const files = ['0001_init.sql', '0002_anonymous_likes.sql'];
  const client = new pg.Client(clientOpts(configs.direct.url));
  await client.connect();
  try {
    await client.query('BEGIN');
    for (const file of files) {
      const sql = readFileSync(join(root, 'supabase', 'migrations', file), 'utf8');
      await client.query(sql);
      console.log(`✅ 已执行 ${file}`);
    }
    await client.query('COMMIT');
    console.log('✅ 全部迁移执行成功');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    // 幂等处理：结构已存在（重复执行）时视为成功，由后面的校验兜底
    if (/(already exists|duplicate)/i.test(e.message || '')) {
      console.log(`⚠️ ${e.message} —— 结构已存在，跳过迁移（幂等）`);
    } else {
      console.error(`❌ 迁移失败: ${e.message}`);
      console.error(`   提示: ${e.hint || '无'}`);
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

// ---------- 3. 校验 ----------
async function verify() {
  console.log('\n===== 3. 结构校验 =====');
  const client = new pg.Client(clientOpts(configs.direct.url));
  await client.connect();
  try {
    const tables = await client.query(
      `select table_name from information_schema.tables
       where table_schema='public' and table_type='BASE TABLE' order by table_name`
    );
    console.log('📋 public 表:', tables.rows.map((r) => r.table_name).join(', ') || '(空)');

    const topics = await client.query(
      'select name, slug from public.topics order by sort_order'
    );
    console.log('🗂️ 话题种子:', topics.rows.map((r) => `${r.name}(${r.slug})`).join(', ') || '(空)');

    const policies = await client.query(
      `select tablename, count(*) as cnt from pg_policies
       where schemaname='public' group by tablename order by tablename`
    );
    console.log('🔒 RLS 策略数:', policies.rows.map((r) => `${r.tablename}=${r.cnt}`).join(', '));

    const trigs = await client.query(
      `select tgname from pg_trigger where not tgisinternal and tgrelid in (
         select oid from pg_class where relnamespace = 'public'::regnamespace
       )`
    );
    console.log('⚙️ 触发器:', trigs.rows.map((r) => r.tgname).join(', ') || '(空)');

    const buckets = await client.query(
      `select id, public from storage.buckets where id in ('media','avatars')`
    );
    console.log('🗄️ 存储桶:', buckets.rows.map((r) => `${r.id}(public=${r.public})`).join(', ') || '(空)');

    // auth.users 上的注册触发器（在 auth schema，需单独确认）
    const authTrigs = await client.query(
      `select tgname from pg_trigger where not tgisinternal and tgrelid = 'auth.users'::regclass`
    );
    console.log('🔔 auth 触发器:', authTrigs.rows.map((r) => r.tgname).join(', ') || '(无)');

    const funcs = await client.query(
      `select proname from pg_proc
       where proname in ('is_admin','handle_new_user','set_updated_at','sync_like_count','sync_favorite_count','sync_comment_count')`
    );
    console.log('🧩 关键函数:', funcs.rows.map((r) => r.proname).join(', ') || '(无)');
  } catch (e) {
    console.error(`❌ 校验失败: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

await testConnections();
await runMigrations();
await verify();
console.log('\n完成。');
