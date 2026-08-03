-- 0021: 推荐流增强——关注作者的猫咪品种加权
-- 用户关注作者们的猫品种，与当前笔记同品种时加权 ×1.15，让个性化更贴近常看内容。
-- 注意：必须 drop 旧 4 参版本，避免 PostgREST 匹配旧签名。

drop function if exists public.recommend_notes(uuid, int, int, boolean);

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
    * case when exists (
        -- 关注作者的猫咪品种加权：与常看的猫同类内容更靠前
        select 1
        from public.follows f
        join public.cats fc on fc.owner_id = f.following_id
        where f.follower_id = p_user
          and fc.breed is not null
          and fc.breed = c.breed
      ) then 1.15 else 1 end
    * case when p_shuffle then (1 + 0.3 * random()) else 1 end
  ) desc,
  n.created_at desc,
  n.id desc
  limit p_limit offset p_offset;
$$;

grant execute on function public.recommend_notes(uuid, int, int, boolean) to authenticated;
