-- ============================================================
-- 只有猫 · P2-M1 关注体系
-- follows 关注关系表 + RLS + 索引
-- ============================================================

-- 1. follows 关注关系表
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists idx_follows_follower on public.follows (follower_id, created_at desc);
create index if not exists idx_follows_following on public.follows (following_id, created_at desc);

alter table public.follows enable row level security;

-- 关注关系公开可读（关注数/粉丝数对所有人可见）
create policy "follows_select" on public.follows
  for select using (true);
-- 只能关注别人（自己作为 follower）
create policy "follows_insert" on public.follows
  for insert with check (auth.uid() = follower_id);
-- 只能取关自己发出的关注
create policy "follows_delete" on public.follows
  for delete using (auth.uid() = follower_id);

-- 2. 辅助函数：是否已关注（供前端/RLS 使用）
create or replace function public.is_following(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.follows
    where follower_id = auth.uid() and following_id = target_user_id
  );
$$;
