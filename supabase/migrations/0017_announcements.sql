-- 0020: 站内公告系统
-- announcements 表：后台维护，前台首页展示最新启用公告
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_announcements_active on public.announcements (active, created_at desc);

alter table public.announcements enable row level security;

-- 所有人可读；写操作仅 service_role（后台用 admin client）
create policy "announcements_read" on public.announcements
  for select using (true);
