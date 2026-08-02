-- ============================================================
-- 只有猫 · P2-M2 通知中心
-- notifications 表 + 点赞/评论/关注自动触发 + RLS
-- 实时性：先落库 + 拉取兜底（WebSocket 实时推送后置）
-- ============================================================

-- 1. notifications 通知表
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('like','comment','follow','system')),
  note_id uuid references public.notes(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  content text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications (user_id)
  where read = false;

alter table public.notifications enable row level security;

-- 只能看自己的通知；只能标记自己的通知为已读
create policy "notifications_select" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications_update" on public.notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. 点赞 → 通知笔记作者（去重：同一人同一篇未读只发一条）
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  if new.user_id is null then
    return new; -- 游客点赞不产生通知
  end if;
  select author_id into v_author from public.notes where id = new.note_id;
  if v_author is not null and v_author <> new.user_id and not exists (
    select 1 from public.notifications
    where user_id = v_author and actor_id = new.user_id
      and type = 'like' and note_id = new.note_id and read = false
  ) then
    insert into public.notifications (user_id, actor_id, type, note_id)
    values (v_author, new.user_id, 'like', new.note_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_like on public.likes;
create trigger trg_notify_like after insert on public.likes
  for each row execute function public.notify_on_like();

-- 3. 评论 → 通知笔记作者（去重）
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select author_id into v_author from public.notes where id = new.note_id;
  if v_author is not null and v_author <> new.user_id and not exists (
    select 1 from public.notifications
    where user_id = v_author and actor_id = new.user_id
      and type = 'comment' and note_id = new.note_id and read = false
  ) then
    insert into public.notifications (user_id, actor_id, type, note_id, comment_id)
    values (v_author, new.user_id, 'comment', new.note_id, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_comment on public.comments;
create trigger trg_notify_comment after insert on public.comments
  for each row execute function public.notify_on_comment();

-- 4. 关注 → 通知被关注者
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;

drop trigger if exists trg_notify_follow on public.follows;
create trigger trg_notify_follow after insert on public.follows
  for each row execute function public.notify_on_follow();
