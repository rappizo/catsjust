import { redirect } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { MessagesHub, type ConversationRow } from '@/components/MessagesHub';
import { isSupabaseConfigured } from '@/lib/config';
import { getLocaleFromCookies } from '@/lib/i18n/cookies';
import { getT } from '@/lib/i18n/dictionaries';
import type { AppNotification } from '@/lib/types';

export const metadata = { title: '消息' };

export default async function MessagesPage() {
  if (!isSupabaseConfigured()) redirect('/login?next=/messages');

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/messages');

  const t = getT(getLocaleFromCookies());

  const [{ data }, { data: convos }] = await Promise.all([
    supabase
      .from('notifications')
      .select('*, actor:profiles!notifications_actor_id_fkey(*), note:notes(id, title, cover_url, media)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('conversations')
      .select(
        'id, user_a, user_b, last_message_at, last_preview, unread_a, unread_b, created_at, oa:profiles!conversations_user_a_fkey(id, username, nickname, avatar_url), ob:profiles!conversations_user_b_fkey(id, username, nickname, avatar_url)'
      )
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
      .limit(100),
  ]);
  const notifications = (data ?? []) as AppNotification[];

  // 组装会话列表（提取对方用户 + 我的未读数）
  const conversations: ConversationRow[] = (convos ?? []).map((c: any) => {
    const a = Array.isArray(c.oa) ? c.oa[0] : c.oa;
    const b = Array.isArray(c.ob) ? c.ob[0] : c.ob;
    const meIsA = c.user_a === user.id;
    const other = meIsA ? b : a;
    return {
      id: c.id,
      other: other ?? null,
      lastMessage: c.last_preview,
      lastMessageAt: c.last_message_at,
      unread: meIsA ? c.unread_a : c.unread_b,
    };
  });

  // 打开消息中心即把通知标记为已读
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-brand-500" />
        <h1 className="text-xl font-bold text-ink">{t('messages', 'title')}</h1>
      </div>
      <MessagesHub notifications={notifications} conversations={conversations} />
    </div>
  );
}
