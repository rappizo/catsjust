-- ============================================================
-- 只有猫 · L3 注册兴趣：handle_new_user 扩展
-- 注册时若携带 interests 元数据（[{type,value}]），自动写入 profile_interests
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_nickname text;
  v_interest jsonb;
  v_type text;
  v_value text;
begin
  v_username := 'cat_' || substr(replace(new.id::text, '-', ''), 1, 10);
  v_nickname := coalesce(nullif(new.raw_user_meta_data->>'nickname', ''), '喵友' || substr(replace(new.id::text, '-', ''), 1, 6));
  insert into public.profiles (id, username, nickname)
  values (new.id, v_username, v_nickname)
  on conflict (id) do nothing;

  -- 兴趣标签（注册时可选，[{type,value}] 数组）
  if jsonb_typeof(new.raw_user_meta_data->'interests') = 'array' then
    for v_interest in select * from jsonb_array_elements(new.raw_user_meta_data->'interests')
    loop
      v_type := v_interest->>'type';
      v_value := v_interest->>'value';
      if v_type in ('topic', 'breed') and coalesce(v_value, '') <> '' then
        insert into public.profile_interests (user_id, interest_type, interest_value)
        values (new.id, v_type, v_value)
        on conflict (user_id, interest_type, interest_value) do nothing;
      end if;
    end loop;
  end if;

  return new;
end;
$$;
