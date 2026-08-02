import { redirect } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { MessagesHub } from '@/components/MessagesHub';
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

  const { data } = await supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(*), note:notes(id, title, cover_url, media)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  const notifications = (data ?? []) as AppNotification[];

  // 打开消息中心即把通知标记为已读（私信已读在 L2 处理）
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
      <MessagesHub notifications={notifications} />
    </div>
  );
}
