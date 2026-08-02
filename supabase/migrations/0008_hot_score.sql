-- ============================================================
-- 只有猫 · P2-M5 推荐热度排序
-- hot_score = 点赞*3 + 评论*5 + 收藏*4，随计数触发器实时更新
-- ============================================================

-- 1. notes 增加热度分
alter table public.notes
  add column if not exists hot_score int not null default 0;

create index if not exists idx_notes_hot on public.notes (status, hot_score desc, created_at desc);

-- 2. 热度分计算函数
create or replace function public.compute_hot_score(
  v_like int, v_comment int, v_favorite int
)
returns int
language sql
immutable
as $$
  select (v_like * 3 + v_comment * 5 + v_favorite * 4)
$$;

-- 3. 在三个计数触发器中同步热度分
create or replace function public.sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.notes
      set like_count = like_count + 1,
          hot_score = public.compute_hot_score(like_count + 1, comment_count, favorite_count)
      where id = new.note_id;
  elsif tg_op = 'DELETE' then
    update public.notes
      set like_count = greatest(like_count - 1, 0),
          hot_score = public.compute_hot_score(greatest(like_count - 1, 0), comment_count, favorite_count)
      where id = old.note_id;
  end if;
  return null;
end;
$$;

create or replace function public.sync_favorite_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.notes
      set favorite_count = favorite_count + 1,
          hot_score = public.compute_hot_score(like_count, comment_count, favorite_count + 1)
      where id = new.note_id;
  elsif tg_op = 'DELETE' then
    update public.notes
      set favorite_count = greatest(favorite_count - 1, 0),
          hot_score = public.compute_hot_score(like_count, comment_count, greatest(favorite_count - 1, 0))
      where id = old.note_id;
  end if;
  return null;
end;
$$;

create or replace function public.sync_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.notes
      set comment_count = comment_count + 1,
          hot_score = public.compute_hot_score(like_count, comment_count + 1, favorite_count)
      where id = new.note_id;
  elsif tg_op = 'DELETE' then
    update public.notes
      set comment_count = greatest(comment_count - 1, 0),
          hot_score = public.compute_hot_score(like_count, greatest(comment_count - 1, 0), favorite_count)
      where id = old.note_id;
  end if;
  return null;
end;
$$;

-- 4. 回填已有笔记的热度分
update public.notes
  set hot_score = public.compute_hot_score(like_count, comment_count, favorite_count)
  where hot_score = 0;
