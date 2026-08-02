-- ============================================================
-- 只有猫 · 多语言：用户界面语言
-- ============================================================

-- 1. profiles 增加界面语言列
alter table public.profiles
  add column if not exists language text not null default 'zh-Hans';

-- 2. 注册触发器：从 raw_user_meta_data 读取 language（注册时选择）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_nickname text;
  v_language text;
begin
  v_username := 'cat_' || substr(replace(new.id::text, '-', ''), 1, 10);
  v_nickname := coalesce(nullif(new.raw_user_meta_data->>'nickname', ''), '喵友' || substr(replace(new.id::text, '-', ''), 1, 6));
  v_language := coalesce(nullif(new.raw_user_meta_data->>'language', ''), 'zh-Hans');
  insert into public.profiles (id, username, nickname, language)
  values (new.id, v_username, v_nickname, v_language)
  on conflict (id) do nothing;
  return new;
end;
$$;
