-- ============================================================
-- 只有猫 · P2-M3 搜索
-- pg_trgm 中文模糊检索（ILIKE %kw% 走 GIN 索引）
-- ============================================================

create extension if not exists pg_trgm;

-- 笔记：标题 / 正文
create index if not exists idx_notes_title_trgm on public.notes using gin (title gin_trgm_ops);
create index if not exists idx_notes_content_trgm on public.notes using gin (content gin_trgm_ops);

-- 用户：昵称 / 用户名 / 简介
create index if not exists idx_profiles_nickname_trgm on public.profiles using gin (nickname gin_trgm_ops);
create index if not exists idx_profiles_username_trgm on public.profiles using gin (username gin_trgm_ops);
create index if not exists idx_profiles_bio_trgm on public.profiles using gin (bio gin_trgm_ops);

-- 话题：名称 / 简介
create index if not exists idx_topics_name_trgm on public.topics using gin (name gin_trgm_ops);
create index if not exists idx_topics_desc_trgm on public.topics using gin (description gin_trgm_ops);

-- 猫咪：名字 / 品种 / 简介
create index if not exists idx_cats_name_trgm on public.cats using gin (name gin_trgm_ops);
create index if not exists idx_cats_breed_trgm on public.cats using gin (breed gin_trgm_ops);
create index if not exists idx_cats_bio_trgm on public.cats using gin (bio gin_trgm_ops);
