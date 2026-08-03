-- 0015: 推荐流刷新随机扰动
-- 目的：下拉刷新时，给排序分数乘一个每行独立的随机因子（±15%），
--       让推荐结果「相似但不完全一样」——高分/兴趣相关的内容仍靠前，相近分数的会随机换位。
-- 函数由 stable 改为 volatile（内部使用 random()），仅刷新（p_shuffle=true）时启用扰动。
-- 注意：必须删除旧的 3 参数版本，否则 PostgREST 调用同名函数时可能匹配到旧签名导致扰动失效。

drop function if exists public.recommend_notes(uuid, int, int);

create or replace function public.recommend_notes(p_user uuid, p_limit int default 20, p_offset int default 0, p_shuffle boolean default false)
returns setof public.notes
language sql
security definer
set search_path = public
volatile
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
    * case when p_shuffle then (1 + 0.3 * random()) else 1 end
  ) desc,
  n.created_at desc,
  n.id desc
  limit p_limit offset p_offset;
$$;

grant execute on function public.recommend_notes(uuid, int, int, boolean) to authenticated;
