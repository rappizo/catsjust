-- ============================================================
-- 只有猫 · P2-M4 评论升级 + 内容管理
-- 1) 评论点赞  2) 笔记草稿状态  3) 作者可编辑（编辑后重新送审）
-- ============================================================

-- ---------- 1. 评论点赞 ----------
alter table public.comments
  add column if not exists like_count int not null default 0;

create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, comment_id)
);

create index if not exists idx_comment_likes_comment on public.comment_likes (comment_id);

alter table public.comment_likes enable row level security;

create policy "comment_likes_select" on public.comment_likes
  for select using (true);
create policy "comment_likes_insert" on public.comment_likes
  for insert with check (auth.uid() = user_id);
create policy "comment_likes_delete" on public.comment_likes
  for delete using (auth.uid() = user_id);

-- 评论点赞数同步
create or replace function public.sync_comment_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set like_count = like_count + 1 where id = new.comment_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_comment_like_count on public.comment_likes;
create trigger trg_comment_like_count after insert or delete on public.comment_likes
  for each row execute function public.sync_comment_like_count();

-- ---------- 2. 笔记草稿状态 ----------
-- 扩展 status 枚举：新增 'draft'
alter table public.notes drop constraint if exists notes_status_check;
alter table public.notes
  add constraint notes_status_check check (status in ('pending','published','rejected','removed','draft'));

-- 作者可编辑：把「已发布」改回待审、编辑草稿等（with check 限定为非 published，防绕过审核）
drop policy if exists "notes_update_owner" on public.notes;
create policy "notes_update_owner" on public.notes
  for update using (auth.uid() = author_id)
  with check (auth.uid() = author_id and status in ('pending','rejected','draft'));

-- 评论也支持回复（parent_id 已存在），评论点赞通知：当评论被点赞时通知评论作者
create or replace function public.notify_on_comment_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select user_id into v_author from public.comments where id = new.comment_id;
  if v_author is not null and v_author <> new.user_id and not exists (
    select 1 from public.notifications
    where user_id = v_author and actor_id = new.user_id
      and type = 'comment' and comment_id = new.comment_id and read = false
  ) then
    insert into public.notifications (user_id, actor_id, type, comment_id)
    values (v_author, new.user_id, 'comment', new.comment_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_comment_like on public.comment_likes;
create trigger trg_notify_comment_like after insert on public.comment_likes
  for each row execute function public.notify_on_comment_like();
