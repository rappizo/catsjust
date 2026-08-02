-- ============================================================
-- 喵岛 · P1.1 匿名点赞
-- 点赞不需要登录：游客通过浏览器 cookie（guest_id）标识
-- ============================================================

-- 1. likes.user_id 允许为空（游客点赞无用户），新增 guest_id 字段
alter table public.likes
  alter column user_id drop not null,
  add column if not exists guest_id text;

-- 2. 去掉旧的全表唯一约束，改用部分唯一索引：
--    登录用户：一人对一篇笔记最多一赞
--    游客：    一个设备（guest_id）对一篇笔记最多一赞
alter table public.likes drop constraint if exists likes_user_id_note_id_key;

drop index if exists likes_unique_user;
create unique index likes_unique_user on public.likes (user_id, note_id)
  where user_id is not null;

drop index if exists likes_unique_guest;
create unique index likes_unique_guest on public.likes (guest_id, note_id)
  where guest_id is not null;

-- 3. 更新 RLS：
--    插入：登录用户只能写自己的；游客可写入（user_id 为空且带 guest_id）
--    删除：登录用户只能删自己的；游客可删匿名赞（user_id 为空）
drop policy if exists "likes_insert" on public.likes;
create policy "likes_insert" on public.likes
  for insert with check (
    (auth.uid() = user_id) or (user_id is null and guest_id is not null)
  );

drop policy if exists "likes_delete" on public.likes;
create policy "likes_delete" on public.likes
  for delete using (
    (auth.uid() = user_id) or (user_id is null)
  );

-- 4. 说明：likes_select 仍为公开可读（计数对所有人可见），无需改动
