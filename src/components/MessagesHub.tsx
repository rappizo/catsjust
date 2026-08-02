'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Heart, Mail, Megaphone, MessageCircle, UserPlus } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Avatar } from './Avatar';
import type { AppNotification, Profile } from '@/lib/types';

export interface ConversationRow {
  id: string;
  other: { id: string; username: string; nickname: string | null; avatar_url: string | null } | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unread: number;
}

interface MessagesHubProps {
  notifications: AppNotification[];
  conversations: ConversationRow[];
}

type TabKey = 'dm' | 'comment' | 'like' | 'follow' | 'system';

/** 消息中心：私信 / 评论回复 / 点赞 / 关注 / 系统 */
export function MessagesHub({ notifications, conversations }: MessagesHubProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>('dm');

  const dmUnread = conversations.reduce((s, c) => s + c.unread, 0);
  const countFor = (type: AppNotification['type']) =>
    notifications.filter((n) => n.type === type && !n.read).length;

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: 'dm', label: t('messages', 'dm'), count: dmUnread },
    { key: 'comment', label: t('messages', 'reply'), count: countFor('comment') },
    { key: 'like', label: t('messages', 'likes'), count: countFor('like') },
    { key: 'follow', label: t('messages', 'follows'), count: countFor('follow') },
    { key: 'system', label: t('messages', 'system'), count: countFor('system') },
  ];

  const filtered = notifications.filter((n) => {
    if (tab === 'dm') return false;
    const map: Record<Exclude<TabKey, 'dm'>, AppNotification['type']> = {
      comment: 'comment',
      like: 'like',
      follow: 'follow',
      system: 'system',
    };
    return n.type === map[tab as Exclude<TabKey, 'dm'>];
  });

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
    <div>
      {/* 分段控件（横向可滚动） */}
      <div className="no-scrollbar -mx-1 mb-5 flex items-center gap-1 overflow-x-auto border-b border-stone-200/70 px-1">
        {tabs.map((tItem) => (
          <button
            key={tItem.key}
            onClick={() => setTab(tItem.key)}
            className={cn(
              'relative -mb-px shrink-0 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === tItem.key ? 'text-brand-600' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            {tItem.label}
            {typeof tItem.count === 'number' && tItem.count > 0 && (
              <span className="ml-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">
                {tItem.count}
              </span>
            )}
            {tab === tItem.key && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500" />
            )}
          </button>
        ))}
      </div>

      {/* 私信：会话列表 */}
      {tab === 'dm' &&
        (conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200/60 bg-white px-5 py-16 text-center shadow-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-400">
              <Mail className="h-7 w-7" />
            </span>
            <p className="font-semibold text-stone-600">{t('messages', 'dmEmptyTitle')}</p>
            <p className="max-w-sm text-sm text-stone-400">{t('messages', 'dmEmptyDesc')}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/messages/conversations/${c.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-stone-200/60 bg-white px-4 py-3 shadow-card transition hover:border-brand-300 hover:shadow-card-hover"
                >
                  <Avatar
                    src={c.other?.avatar_url}
                    alt={c.other?.nickname || c.other?.username || '?'}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-semibold text-ink">
                        {c.other?.nickname || c.other?.username || t('messages', 'unknownUser')}
                      </p>
                      <span className="shrink-0 text-[11px] text-stone-300">
                        {timeAgo(c.lastMessageAt)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'mt-0.5 truncate text-sm',
                        c.unread > 0 ? 'font-medium text-ink' : 'text-stone-400'
                      )}
                    >
                      {c.lastMessage || t('messages', 'noMessagesYet')}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-1.5 text-[10px] font-bold text-white">
                      {c.unread > 99 ? '99+' : c.unread}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ))}

      {/* 通知分组（评论回复/点赞/关注/系统） */}
      {tab !== 'dm' &&
        (filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200/60 bg-white px-5 py-16 text-center shadow-card">
            <Bell className="h-10 w-10 text-stone-300" />
            <p className="font-semibold text-stone-600">{t('notifications', 'empty')}</p>
            <p className="text-sm text-stone-400">{t('notifications', 'emptyDesc')}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((n) => {
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
        ))}
    </div>
  );
}
