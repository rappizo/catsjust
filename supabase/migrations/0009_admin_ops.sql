-- ============================================================
-- 只有猫 · P2-M6 后台运营
-- 1) 权限细化  2) 举报体系  3) 敏感词  4) 品种词典
-- ============================================================

-- ---------- 1. 权限细化：新增审核员角色（先定义函数，供后续策略引用） ----------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user','moderator','admin'));

-- 审核员：可审核内容、处理举报（不含用户封禁/权限管理）
create or replace function public.is_moderator()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator','admin') and status = 'active'
  );
$$;

-- ---------- 2. 举报表 ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  note_id uuid references public.notes(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete cascade,
  reason text not null,
  detail text,
  status text not null default 'open' check (status in ('open','processing','resolved','rejected')),
  resolution text,
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_status on public.reports (status, created_at desc);

alter table public.reports enable row level security;

create policy "reports_insert" on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy "reports_select_admin" on public.reports
  for select using (public.is_admin() or public.is_moderator());
create policy "reports_update_admin" on public.reports
  for update using (public.is_admin() or public.is_moderator())
  with check (public.is_admin() or public.is_moderator());

-- ---------- 3. 敏感词表 ----------
create table if not exists public.sensitive_words (
  id uuid primary key default gen_random_uuid(),
  word text unique not null,
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now()
);

alter table public.sensitive_words enable row level security;

create policy "sensitive_words_select" on public.sensitive_words
  for select using (true);
create policy "sensitive_words_admin" on public.sensitive_words
  for all using (public.is_admin())
  with check (public.is_admin());

-- 命中敏感词判断函数（发布/评论校验共用）
create or replace function public.has_sensitive_word(v_text text)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_word text;
begin
  if v_text is null or v_text = '' then
    return null;
  end if;
  for v_word in
    select word from public.sensitive_words
    where status = 'active' and v_text ilike '%' || word || '%'
    limit 1
  loop
    return v_word;
  end loop;
  return null;
end;
$$;

-- ---------- 4. 品种词典表 ----------
create table if not exists public.breeds (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  sort_order int not null default 0,
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now()
);

alter table public.breeds enable row level security;

create policy "breeds_select" on public.breeds
  for select using (status = 'active' or public.is_admin());
create policy "breeds_admin" on public.breeds
  for all using (public.is_admin())
  with check (public.is_admin());

-- 预置默认品种（与前端常量对齐，后台可增删改）
insert into public.breeds (name, sort_order) values
  ('中华田园猫', 1), ('英国短毛猫', 2), ('美国短毛猫', 3), ('布偶猫', 4),
  ('暹罗猫', 5), ('波斯猫', 6), ('缅因猫', 7), ('苏格兰折耳猫', 8),
  ('俄罗斯蓝猫', 9), ('挪威森林猫', 10), ('阿比西尼亚猫', 11), ('孟买猫', 12),
  ('孟加拉豹猫', 13), ('美国卷耳猫', 14), ('异国短毛猫', 15), ('橘猫', 16),
  ('奶牛猫', 17), ('三花猫', 18), ('狸花猫', 19), ('其他', 20)
on conflict (name) do nothing;

-- ---------- 5. 审核员权限：审核日志 + 全部笔记可见 ----------
drop policy if exists "review_logs_select" on public.review_logs;
create policy "review_logs_select" on public.review_logs
  for select using (public.is_admin() or public.is_moderator());
drop policy if exists "review_logs_insert" on public.review_logs;
create policy "review_logs_insert" on public.review_logs
  for insert with check (public.is_admin() or public.is_moderator());

-- 审核员可见全部笔记（用于审核）
drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes
  for select using (
    status = 'published' or auth.uid() = author_id or public.is_admin() or public.is_moderator()
  );
