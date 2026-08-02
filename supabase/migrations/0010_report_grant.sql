-- ============================================================
-- 只有猫 · P2-M6 补充：授予敏感词校验函数执行权限
-- 发布 / 评论时由登录用户直接调用 has_sensitive_word() 做前端拦截
-- ============================================================

grant execute on function public.has_sensitive_word(text) to anon, authenticated, service_role;

-- 审核员角色判断函数：后台 Server Action 使用 service_role 不受影响，
-- 此处补授 authenticated，便于后续前端按角色展示差异化功能
grant execute on function public.is_moderator() to authenticated, service_role;
