-- ============================================================
-- 只有猫 · N3 原生推送
-- 1) push_tokens 表（App 注册的 Expo Push Token，RLS 本人）
-- 2) 通知插入 → pg_net 调 Vercel /api/v1/push（Expo Push Service）
-- 3) 私信新消息 → 同上
-- 注意：需 Supabase 项目启用 pg_net 扩展（免费项目默认可用）
-- ============================================================

-- ---------- 1. push_tokens ----------
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_token text not null unique,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_tokens_user on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "push_tokens_select" on public.push_tokens
  for select using (auth.uid() = user_id);
create policy "push_tokens_insert" on public.push_tokens
  for insert with check (auth.uid() = user_id);
create policy "push_tokens_update" on public.push_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_tokens_delete" on public.push_tokens
  for delete using (auth.uid() = user_id);

-- ---------- 2. pg_net（异步 HTTP，需与 Supabase 项目一致） ----------
create extension if not exists pg_net;

-- 推送网关地址（Vercel 部署的 Web 端，负责调 Expo Push Service）
-- 与 Web 端 env PUSH_SECRET 保持一致
do $$
begin
  perform set_config('app.push_gateway', 'https://www.catsjust.com/api/v1/push', false);
  perform set_config('app.push_secret', 'catsjust_push_secret_2026', false);
end $$;

-- ---------- 3. 通知 → 推送 ----------
create or replace function public.push_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_body text;
begin
  if new.type = 'like' then
    v_title := '❤️ 有人赞了你的笔记';
    v_body := '点击查看';
  elsif new.type = 'comment' then
    v_title := '💬 有人评论了你的笔记';
    v_body := '点击查看';
  elsif new.type = 'follow' then
    v_title := '🐾 有新的粉丝';
    v_body := '点击查看';
  else
    v_title := '只有猫';
    v_body := coalesce(new.content, '系统通知');
  end if;

  perform net.http_post(
    url := current_setting('app.push_gateway', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Push-Secret', current_setting('app.push_secret', true)
    ),
    body := jsonb_build_object(
      'userId', new.user_id,
      'title', v_title,
      'body', v_body,
      'data', jsonb_build_object('notificationId', new.id, 'type', new.type)
    )::text
  );
  return new;
end;
$$;

drop trigger if exists trg_push_notification on public.notifications;
create trigger trg_push_notification
  after insert on public.notifications
  for each row execute function public.push_notification();

-- ---------- 4. 私信新消息 → 推送 ----------
create or replace function public.push_dm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receiver uuid;
begin
  select case when new.sender_id = user_a then user_b else user_a end
    into v_receiver from public.conversations where id = new.conversation_id;
  if v_receiver is null then
    return new;
  end if;

  perform net.http_post(
    url := current_setting('app.push_gateway', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Push-Secret', current_setting('app.push_secret', true)
    ),
    body := jsonb_build_object(
      'userId', v_receiver,
      'title', '💬 新私信',
      'body', left(new.content, 50),
      'data', jsonb_build_object('conversationId', new.conversation_id, 'type', 'dm')
    )::text
  );
  return new;
end;
$$;

drop trigger if exists trg_push_dm on public.messages;
create trigger trg_push_dm
  after insert on public.messages
  for each row execute function public.push_dm();

-- 执行权限
grant execute on function public.push_notification() to authenticated;
grant execute on function public.push_dm() to authenticated;
