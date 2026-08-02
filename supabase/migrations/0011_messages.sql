-- ============================================================
-- 只有猫 · L2 私信与消息中心
-- 1) conversations 会话  2) messages 消息  3) Realtime
-- 4) 评论回复通知补全（楼中楼回复也通知被回复者）
-- ============================================================

-- ---------- 1. conversations 会话表 ----------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- 约定：user_a < user_b（字典序），保证同一对用户只有一条会话
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  last_preview text,
  unread_a int not null default 0,
  unread_b int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a <> user_b)
);

create index if not exists idx_conversations_a on public.conversations (user_a, last_message_at desc);
create index if not exists idx_conversations_b on public.conversations (user_b, last_message_at desc);

-- 插入/更新时归一化 user_a < user_b（uuid 可比较）
create or replace function public.conversations_normalize()
returns trigger
language plpgsql
as $$
declare
  lo uuid;
  hi uuid;
begin
  if new.user_a > new.user_b then
    lo := new.user_b;
    hi := new.user_a;
    new.user_a := lo;
    new.user_b := hi;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_conversations_normalize on public.conversations;
create trigger trg_conversations_normalize
  before insert or update on public.conversations
  for each row execute function public.conversations_normalize();

-- ---------- 2. messages 消息表 ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages (conversation_id, created_at asc);

-- 新消息 → 更新会话最后消息/预览/未读数
create or replace function public.on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_preview = left(new.content, 80),
      unread_a = case when new.sender_id = user_a then unread_a else unread_a + 1 end,
      unread_b = case when new.sender_id = user_b then unread_b else unread_b + 1 end
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_message_insert on public.messages;
create trigger trg_message_insert
  after insert on public.messages
  for each row execute function public.on_message_insert();

-- 会话已读：把当前用户的未读数清零
create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set unread_a = case when auth.uid() = user_a then 0 else unread_a end,
      unread_b = case when auth.uid() = user_b then 0 else unread_b end
  where id = p_conversation
    and (auth.uid() = user_a or auth.uid() = user_b);
end;
$$;

-- ---------- 3. RLS ----------
alter table public.conversations enable row level security;

create policy "conversations_select" on public.conversations
  for select using (auth.uid() = user_a or auth.uid() = user_b);
create policy "conversations_insert" on public.conversations
  for insert with check (auth.uid() = user_a or auth.uid() = user_b);
create policy "conversations_update" on public.conversations
  for update using (auth.uid() = user_a or auth.uid() = user_b)
  with check (auth.uid() = user_a or auth.uid() = user_b);

alter table public.messages enable row level security;

create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (auth.uid() = c.user_a or auth.uid() = c.user_b)
    )
  );
create policy "messages_insert" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (auth.uid() = c.user_a or auth.uid() = c.user_b)
    )
  );
create policy "messages_update" on public.messages
  for update using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (auth.uid() = c.user_a or auth.uid() = c.user_b)
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (auth.uid() = c.user_a or auth.uid() = c.user_b)
    )
  );

-- ---------- 4. 函数执行权限 ----------
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ---------- 5. Realtime：私信即时收发 ----------
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;

-- ---------- 6. 评论回复通知补全 ----------
-- 楼中楼回复时，额外通知被回复的评论作者（原触发器只通知笔记作者）
create or replace function public.notify_on_comment_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_author uuid;
begin
  if new.parent_id is null then
    return new;
  end if;
  select user_id into v_parent_author from public.comments where id = new.parent_id;
  if v_parent_author is not null
     and v_parent_author <> new.user_id
     and not exists (
       select 1 from public.notifications
       where user_id = v_parent_author and actor_id = new.user_id
         and type = 'comment' and comment_id = new.id and read = false
     ) then
    insert into public.notifications (user_id, actor_id, type, note_id, comment_id)
    values (v_parent_author, new.user_id, 'comment', new.note_id, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_comment_reply on public.comments;
create trigger trg_notify_comment_reply
  after insert on public.comments
  for each row execute function public.notify_on_comment_reply();
