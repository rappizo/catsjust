-- 将 notifications 加入 Realtime 发布，支持底部 Tab 未读角标实时更新
alter publication supabase_realtime add table public.notifications;
