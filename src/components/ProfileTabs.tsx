'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Waterfall } from './Waterfall';
import type { Note } from '@/lib/types';

interface ProfileTabsProps {
  worksNotes: Note[];
  favoritesNotes: Note[];
  likesNotes: Note[];
  /** 是否本人主页（决定空状态文案） */
  isOwner: boolean;
}

type TabKey = 'works' | 'favorites' | 'likes';

/** 用户主页内容 Tab：作品 / 收藏 / 喜欢 */
export function ProfileTabs({ worksNotes, favoritesNotes, likesNotes, isOwner }: ProfileTabsProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>('works');

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: 'works', label: t('profile', 'worksTitle'), count: worksNotes.length },
    { key: 'favorites', label: t('profile', 'favoritesTab'), count: favoritesNotes.length },
    { key: 'likes', label: t('profile', 'likesTab'), count: likesNotes.length },
  ];

  const dataFor: Record<TabKey, { notes: Note[]; empty: string; desc: string }> = {
    works: {
      notes: worksNotes,
      empty: t('profile', 'noWorks'),
      desc: isOwner ? t('profile', 'firstPublish') : t('profile', 'noContentYet'),
    },
    favorites: {
      notes: favoritesNotes,
      empty: t('profile', 'noFavorites'),
      desc: isOwner ? t('profile', 'ownEmptyFavorites') : t('profile', 'noFavorites'),
    },
    likes: {
      notes: likesNotes,
      empty: t('profile', 'noLikes'),
      desc: isOwner ? t('profile', 'ownEmptyLikes') : t('profile', 'noLikes'),
    },
  };

  return (
    <div>
      <div className="mb-5 flex items-center gap-1 border-b border-stone-200/70">
        {tabs.map((tItem) => (
          <button
            key={tItem.key}
            onClick={() => setTab(tItem.key)}
            className={cn(
              'relative -mb-px px-4 py-2.5 text-sm font-medium transition-colors',
              tab === tItem.key ? 'text-brand-600' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            {tItem.label}
            {typeof tItem.count === 'number' && (
              <span className="ml-1 text-xs text-stone-400">({tItem.count})</span>
            )}
            {tab === tItem.key && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500" />
            )}
          </button>
        ))}
      </div>

      <Waterfall
        key={tab}
        initialNotes={dataFor[tab].notes}
        staticMode
        emptyTitle={dataFor[tab].empty}
        emptyDescription={dataFor[tab].desc}
      />
    </div>
  );
}
