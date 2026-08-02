'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BottomTabBar } from './BottomTabBar';

interface RealtimeUnreadSyncProps {
  username: string | null;
  initialNotifUnread: number;
  initialDmUnread: number;
  userId: string;
}

/**
 * 实时未读角标：订阅 notifications / conversations 的变动，
 * 让底部 Tab 的「消息」角标即时更新，无需刷新页面。
 *
 * 通知与私信未读数分开维护：
 * - 私信以 conversations 的 unread_a/unread_b 绝对值为准（新消息 +1 / 已读清零）；
 * - 通知 INSERT 时 +1，标记已读时 -1。
 */
export function RealtimeUnreadSync({
  username,
  initialNotifUnread,
  initialDmUnread,
  userId,
}: RealtimeUnreadSyncProps) {
  const [notifUnread, setNotifUnread] = useState(initialNotifUnread);
  const [dmUnread, setDmUnread] = useState(initialDmUnread);

  useEffect(() => {
    setNotifUnread(initialNotifUnread);
  }, [initialNotifUnread]);

  useEffect(() => {
    setDmUnread(initialDmUnread);
  }, [initialDmUnread]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('unread-sync')
      // 新通知
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => setNotifUnread((prev) => prev + 1)
      )
      // 通知被标记已读
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { read: boolean };
          if (row.read) {
            setNotifUnread((prev) => Math.max(0, prev - 1));
          }
        }
      )
      // 私信未读变化（新消息 +1 / 已读清零），以 conversation 绝对值为准
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          const row = payload.new as {
            user_a: string;
            user_b: string;
            unread_a: number;
            unread_b: number;
          };
          if (row.user_a === userId) {
            setDmUnread(row.unread_a);
          } else if (row.user_b === userId) {
            setDmUnread(row.unread_b);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return <BottomTabBar username={username} unreadCount={notifUnread + dmUnread} />;
}
