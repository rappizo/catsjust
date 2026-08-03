-- 0022: 搜索记录（热搜词）
-- search_logs 表：统计搜索词频，前台展示热搜。写入走 service_role（搜索页服务端记录）。
create table if not exists public.search_logs (
  query text primary key,
  count int not null default 1,
  last_searched_at timestamptz not null default now()
);

alter table public.search_logs enable row level security;

-- 前台可读热搜（公开）；写入仅 service_role
create policy "search_logs_select" on public.search_logs
  for select using (true);
