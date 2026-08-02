import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Heart, MessageCircle, UserPlus, Bell, Megaphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { Avatar } from '@/components/Avatar';
import { getLocaleFromCookies } from '@/lib/i18n/cookies';
import { getT } from '@/lib/i18n/dictionaries';
import { timeAgo } from '@/lib/utils';
import type { AppNotification, Profile } from '@/lib/types';

export const metadata = { title: '通知' };

export default async function NotificationsPage() {
  if (!isSupabaseConfigured()) redirect('/login?next=/notifications');

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/notifications');

  const t = getT(getLocaleFromCookies());

  const { data } = await supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(*), note:notes(id, title, cover_url, media)')
    .order('created_at', { ascending: false })
    .limit(50);
  const notifications = (data ?? []) as AppNotification[];

  // 打开页面即全部标记为已读
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  const actorName = (n: AppNotification) => {
    const a = n.actor as Profile | null;
    return a?.nickname || a?.username || t('notifications', 'someone');
  };

  const iconFor = (type: AppNotification['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-rose-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-brand-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-accent-400" />;
      default:
        return <Megaphone className="h-4 w-4 text-amber-500" />;
    }
  };

  const textFor = (n: AppNotification) => {
    switch (n.type) {
      case 'like':
        return t('notifications', 'likedYourNote');
      case 'comment':
        return t('notifications', 'commentedYourNote');
      case 'follow':
        return t('notifications', 'followedYou');
      default:
        return n.content || t('notifications', 'system');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <Bell className="h-5 w-5 text-brand-500" />
        <h1 className="text-xl font-bold text-ink">{t('notifications', 'title')}</h1>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-stone-200/60 bg-white py-20 text-center shadow-card">
          <Bell className="h-10 w-10 text-stone-300" />
          <p className="font-semibold text-stone-600">{t('notifications', 'empty')}</p>
          <p className="text-sm text-stone-400">{t('notifications', 'emptyDesc')}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const actorHref = n.actor ? `/profile/${(n.actor as Profile).username}` : '#';
            const contentHref = n.note_id ? `/notes/${n.note_id}` : actorHref;
            return (
              <li key={n.id}>
                <Link
                  href={contentHref}
                  className="flex items-center gap-3 rounded-2xl border border-stone-200/60 bg-white px-4 py-3 shadow-card transition hover:border-brand-300 hover:shadow-card-hover"
                >
                  {n.actor ? (
                    <Avatar src={(n.actor as Profile).avatar_url} alt={actorName(n)} size="md" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
                      {iconFor(n.type)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-stone-700">
                      <span className="mr-1 inline-flex translate-y-0.5">{iconFor(n.type)}</span>
                      <strong className="font-semibold text-ink">{actorName(n)}</strong>{' '}
                      {textFor(n)}
                      {n.note?.title && (
                        <span className="ml-1 text-brand-600">《{n.note.title}》</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
