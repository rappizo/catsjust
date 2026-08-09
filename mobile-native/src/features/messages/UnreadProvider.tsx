import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { getSupabase } from '@/core/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchUnreadCounts } from './api';

interface UnreadContextValue {
  /** 通知未读（INSERT +1 / 标记已读 -1） */
  notifUnread: number;
  /** 私信未读（conversations unread_a/b 绝对值） */
  dmUnread: number;
  /** 手动刷新（进入消息中心/标记已读后调用） */
  refresh: () => void;
}

const UnreadContext = createContext<UnreadContextValue>({
  notifUnread: 0,
  dmUnread: 0,
  refresh: () => {},
});

export function useUnread(): UnreadContextValue {
  return useContext(UnreadContext);
}

/**
 * 全局未读角标：对齐 Web RealtimeUnreadSync。
 * - 私信以 conversations unread_a/unread_b 绝对值为准；
 * - 通知 INSERT +1，标记已读 -1。
 */
export function UnreadProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [notifUnread, setNotifUnread] = useState(0);
  const [dmUnread, setDmUnread] = useState(0);

  const refresh = useCallback(() => {
    if (!user) return;
    void fetchUnreadCounts(user.id).then((c) => {
      setNotifUnread(c.notif);
      setDmUnread(c.dm);
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifUnread(0);
      setDmUnread(0);
      return;
    }

    void fetchUnreadCounts(user.id).then((c) => {
      setNotifUnread(c.notif);
      setDmUnread(c.dm);
    });

    const supabase = getSupabase();
    const channel = supabase
      .channel('unread-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => setNotifUnread((prev) => prev + 1)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { read: boolean };
          if (row.read) setNotifUnread((prev) => Math.max(0, prev - 1));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          const row = payload.new as {
            user_a: string;
            user_b: string;
            unread_a: number;
            unread_b: number;
          };
          if (row.user_a === user.id) setDmUnread(row.unread_a);
          else if (row.user_b === user.id) setDmUnread(row.unread_b);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <UnreadContext.Provider value={{ notifUnread, dmUnread, refresh }}>
      {children}
    </UnreadContext.Provider>
  );
}
