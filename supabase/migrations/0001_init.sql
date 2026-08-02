-- ============================================================
-- 喵岛 Cat Island · P1 数据库结构
-- 在 Supabase 项目 SQL Editor 中执行本文件
-- ============================================================

-- 跳过函数体即时校验：is_admin() 等函数引用了本文件后面才创建的表
-- （Supabase 官方迁移的惯用做法）
set check_function_bodies = off;

-- ---------- 1. 扩展 ----------
create extension if not exists "pgcrypto";

-- ---------- 2. 辅助函数 ----------
-- 判断当前登录用户是否为管理员（security definer 供 RLS 使用）
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

-- ---------- 3. profiles 用户资料 ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  nickname text,
  avatar_url text,
  cover_url text,
  bio text,
  role text not null default 'user' check (role in ('user','admin')),
  status text not null default 'active' check (status in ('active','banned')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select using (true);
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = 'user');
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin())
  with check (public.is_admin());
create policy "profiles_delete_self" on public.profiles
  for delete using (auth.uid() = id);

-- ---------- 4. cats 猫咪档案 ----------
create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  breed text,
  gender text not null default 'unknown' check (gender in ('male','female','unknown')),
  birthday date,
  personality_tags text[] not null default '{}',
  bio text,
  avatar_url text,
  status text not null default 'active' check (status in ('active','banned')),
  created_at timestamptz not null default now()
);

create index if not exists idx_cats_owner on public.cats (owner_id);

alter table public.cats enable row level security;

create policy "cats_select" on public.cats
  for select using (status = 'active' or auth.uid() = owner_id or public.is_admin());
create policy "cats_insert" on public.cats
  for insert with check (auth.uid() = owner_id);
create policy "cats_update" on public.cats
  for update using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());
create policy "cats_delete" on public.cats
  for delete using (auth.uid() = owner_id or public.is_admin());

-- ---------- 5. topics 话题 ----------
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  cover_url text,
  description text,
  sort_order int not null default 0,
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now()
);

alter table public.topics enable row level security;

create policy "topics_select" on public.topics
  for select using (status = 'active' or public.is_admin());
create policy "topics_insert" on public.topics
  for insert with check (public.is_admin());
create policy "topics_update" on public.topics
  for update using (public.is_admin())
  with check (public.is_admin());
create policy "topics_delete" on public.topics
  for delete using (public.is_admin());

-- ---------- 6. notes 笔记 ----------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  cat_id uuid references public.cats(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  title text,
  content text,
  media jsonb not null default '[]'::jsonb,
  cover_url text,
  media_type text not null default 'image' check (media_type in ('image','video')),
  status text not null default 'pending' check (status in ('pending','published','rejected','removed')),
  reject_reason text,
  like_count int not null default 0,
  comment_count int not null default 0,
  favorite_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notes_feed on public.notes (status, created_at desc);
create index if not exists idx_notes_author on public.notes (author_id, created_at desc);
create index if not exists idx_notes_cat on public.notes (cat_id, created_at desc);
create index if not exists idx_notes_topic on public.notes (topic_id, created_at desc);

alter table public.notes enable row level security;

-- 公开内容人人可看；作者可看自己的（含待审）；管理员可看全部
create policy "notes_select" on public.notes
  for select using (
    status = 'published' or auth.uid() = author_id or public.is_admin()
  );
create policy "notes_insert" on public.notes
  for insert with check (auth.uid() = author_id);
-- 作者只能编辑自己的且状态保持 pending/rejected（编辑后需重新送审，防绕过审核）
create policy "notes_update_owner" on public.notes
  for update using (auth.uid() = author_id)
  with check (auth.uid() = author_id and status in ('pending','rejected'));
create policy "notes_update_admin" on public.notes
  for update using (public.is_admin())
  with check (public.is_admin());
create policy "notes_delete" on public.notes
  for delete using (auth.uid() = author_id or public.is_admin());

-- ---------- 7. likes 点赞 ----------
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, note_id)
);

create index if not exists idx_likes_note on public.likes (note_id);

alter table public.likes enable row level security;

create policy "likes_select" on public.likes for select using (true);
create policy "likes_insert" on public.likes
  for insert with check (auth.uid() = user_id);
create policy "likes_delete" on public.likes
  for delete using (auth.uid() = user_id);

-- ---------- 8. favorites 收藏 ----------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, note_id)
);

create index if not exists idx_favorites_note on public.favorites (note_id);

alter table public.favorites enable row level security;

create policy "favorites_select" on public.favorites for select using (true);
create policy "favorites_insert" on public.favorites
  for insert with check (auth.uid() = user_id);
create policy "favorites_delete" on public.favorites
  for delete using (auth.uid() = user_id);

-- ---------- 9. comments 评论 ----------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_note on public.comments (note_id, created_at);

alter table public.comments enable row level security;

create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = user_id);
create policy "comments_delete" on public.comments
  for delete using (auth.uid() = user_id or public.is_admin());

-- ---------- 10. review_logs 审核日志 ----------
create table if not exists public.review_logs (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('approve','reject','remove')),
  reason text,
  created_at timestamptz not null default now()
);

alter table public.review_logs enable row level security;

create policy "review_logs_select" on public.review_logs
  for select using (public.is_admin());
create policy "review_logs_insert" on public.review_logs
  for insert with check (public.is_admin());

-- ---------- 11. 触发器 ----------
-- 新用户注册时自动创建 profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_nickname text;
begin
  v_username := 'cat_' || substr(replace(new.id::text, '-', ''), 1, 10);
  v_nickname := coalesce(nullif(new.raw_user_meta_data->>'nickname', ''), '喵友' || substr(replace(new.id::text, '-', ''), 1, 6));
  insert into public.profiles (id, username, nickname)
  values (new.id, v_username, v_nickname)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 自动维护 updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
  before update on public.notes
  for each row execute procedure public.set_updated_at();

-- 点赞计数
create or replace function public.sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.notes set like_count = like_count + 1 where id = new.note_id;
  elsif tg_op = 'DELETE' then
    update public.notes set like_count = greatest(like_count - 1, 0) where id = old.note_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_like_count on public.likes;
create trigger trg_like_count
  after insert or delete on public.likes
  for each row execute procedure public.sync_like_count();

-- 收藏计数
create or replace function public.sync_favorite_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.notes set favorite_count = favorite_count + 1 where id = new.note_id;
  elsif tg_op = 'DELETE' then
    update public.notes set favorite_count = greatest(favorite_count - 1, 0) where id = old.note_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_favorite_count on public.favorites;
create trigger trg_favorite_count
  after insert or delete on public.favorites
  for each row execute procedure public.sync_favorite_count();

-- 评论计数
create or replace function public.sync_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.notes set comment_count = comment_count + 1 where id = new.note_id;
  elsif tg_op = 'DELETE' then
    update public.notes set comment_count = greatest(comment_count - 1, 0) where id = old.note_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_comment_count on public.comments;
create trigger trg_comment_count
  after insert or delete on public.comments
  for each row execute procedure public.sync_comment_count();

-- ---------- 12. 存储桶与策略 ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- media 桶：任何人可读，登录用户只能写自己目录
drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media_auth_insert" on storage.objects;
create policy "media_auth_insert" on storage.objects
  for insert with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media_auth_update" on storage.objects;
create policy "media_auth_update" on storage.objects
  for update using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media_auth_delete" on storage.objects;
create policy "media_auth_delete" on storage.objects
  for delete using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- avatars 桶：任何人可读，登录用户只能写自己目录
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_auth_insert" on storage.objects;
create policy "avatars_auth_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_auth_update" on storage.objects;
create policy "avatars_auth_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_auth_delete" on storage.objects;
create policy "avatars_auth_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- 13. 种子数据：默认话题 ----------
insert into public.topics (name, slug, description, sort_order) values
  ('萌猫日常', 'daily', '记录猫咪的每一天', 1),
  ('猫咪美照', 'beauty', '高颜值猫咪摄影大片', 2),
  ('猫咪搞笑', 'funny', '爆笑猫咪名场面', 3),
  ('猫咪科普', 'knowledge', '养猫知识 · 猫咪冷知识', 4),
  ('猫咪领养', 'adoption', '救助与领养信息', 5),
  ('新手养猫', 'newbie', '新手铲屎官指南', 6)
on conflict (slug) do nothing;
