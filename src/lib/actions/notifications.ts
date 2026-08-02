'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import type { AppNotification } from '@/lib/types';

const NOTIFICATION_LIMIT = 50;

/** 我的通知列表（含触发者与关联笔记，最新在前） */
export async function getNotifications(): Promise<AppNotification[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(*), note:notes(id, title, cover_url, media)')
    .order('created_at', { ascending: false })
    .limit(NOTIFICATION_LIMIT);
  return (data ?? []) as AppNotification[];
}

/** 未读通知数（导航角标用） */
export async function getUnreadCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);
  return count ?? 0;
}

/** 全部标记为已读 */
export async function markAllNotificationsRead(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);
  revalidatePath('/notifications');
}
