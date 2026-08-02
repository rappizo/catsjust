-- ============================================================
-- 只有猫 · L3 个性化推荐
-- 1) profile_interests 兴趣标签  2) not_interested 不感兴趣
-- 3) recommend_notes 推荐算法 v1
-- ============================================================

-- ---------- 1. profile_interests 兴趣标签 ----------
create table if not exists public.profile_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  interest_type text not null check (interest_type in ('topic','breed')),
  interest_value text not null,
  created_at timestamptz not null default now(),
  unique (user_id, interest_type, interest_value)
);

create index if not exists idx_interests_user on public.profile_interests (user_id);

alter table public.profile_interests enable row level security;

create policy "interests_select" on public.profile_interests
  for select using (auth.uid() = user_id);
create policy "interests_insert" on public.profile_interests
  for insert with check (auth.uid() = user_id);
create policy "interests_delete" on public.profile_interests
  for delete using (auth.uid() = user_id);

-- ---------- 2. not_interested 不感兴趣（推荐流降权/排除） ----------
create table if not exists public.not_interested (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, note_id)
);

alter table public.not_interested enable row level security;

create policy "not_interested_select" on public.not_interested
  for select using (auth.uid() = user_id);
create policy "not_interested_insert" on public.not_interested
  for insert with check (auth.uid() = user_id);
create policy "not_interested_delete" on public.not_interested
  for delete using (auth.uid() = user_id);

-- ---------- 3. 推荐算法 v1（SQL） ----------
-- 分数 = hot_score × (1 + 0.5×兴趣命中数) × (关注作者? 1.2 : 1)
-- 排除「不感兴趣」的笔记；仅返回已发布内容
create or replace function public.recommend_notes(p_user uuid, p_limit int default 20, p_offset int default 0)
returns setof public.notes
language sql
security definer
set search_path = public
stable
as $$
  select n.*
  from public.notes n
  left join public.cats c on c.id = n.cat_id
  where n.status = 'published'
    and n.id not in (
      select note_id from public.not_interested where user_id = p_user
    )
  order by (
    n.hot_score * (1 + 0.5 * coalesce((
      select count(*)
      from public.profile_interests pi
      where pi.user_id = p_user
        and (
          (pi.interest_type = 'topic' and exists (
            select 1 from public.topics t where t.id = n.topic_id and t.slug = pi.interest_value
          ))
          or (pi.interest_type = 'breed' and pi.interest_value = c.breed)
        )
    ), 0))
    * case when exists (
        select 1 from public.follows f
        where f.follower_id = p_user and f.following_id = n.author_id
      ) then 1.2 else 1 end
  ) desc,
  n.created_at desc,
  n.id desc
  limit p_limit offset p_offset;
$$;

grant execute on function public.recommend_notes(uuid, int, int) to authenticated;
