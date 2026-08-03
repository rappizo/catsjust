-- 轻量前端错误监控：error_logs 表
-- 写入走 service_role（/api/error-report 路由），前端无法直接插入
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  stack text,
  url text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_error_logs_created on public.error_logs (created_at desc);

alter table public.error_logs enable row level security;
-- 不开放任何客户端策略：仅 service_role（后台 admin client）可读写
