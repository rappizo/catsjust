'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Waterfall } from './Waterfall';
import type { Note } from '@/lib/types';

interface HomeTabsProps {
  /** 推荐流首屏数据（热度排序） */
  hotNotes: Note[];
  /** 最新流首屏数据（时间排序） */
  latestNotes: Note[];
  /** 关注流首屏数据（仅登录时传入） */
  followingNotes?: Note[];
  /** 是否已登录（登录后展示「关注」Tab） */
  isLoggedIn?: boolean;
}

type TabKey = 'recommend' | 'latest' | 'following';

/** 首页 Tab：推荐(热度) / 最新(时间) / 关注(关注流) */
export function HomeTabs({
  hotNotes,
  latestNotes,
  followingNotes = [],
  isLoggedIn = false,
}: HomeTabsProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>('recommend');

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'recommend', label: t('home', 'recommend') },
    { key: 'latest', label: t('home', 'latest') },
  ];
  if (isLoggedIn) {
    tabs.push({ key: 'following', label: t('home', 'following') });
  }

  const feedConfig: Record<TabKey, { notes: Note[]; sort: 'hot' | 'latest' | 'following' }> = {
    recommend: { notes: hotNotes, sort: 'hot' },
    latest: { notes: latestNotes, sort: 'latest' },
    following: { notes: followingNotes, sort: 'following' },
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
            {tab === tItem.key && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500" />
            )}
          </button>
        ))}
      </div>

      <Waterfall
        key={`${tab}-${feedConfig[tab].notes.length}`}
        initialNotes={feedConfig[tab].notes}
        apiFeed={tab === 'following' ? 'following' : 'all'}
        apiSort={tab === 'latest' ? 'latest' : tab === 'recommend' ? 'hot' : 'latest'}
        emptyTitle={tab === 'following' ? t('home', 'followingEmptyTitle') : t('home', 'emptyTitle')}
        emptyDescription={
          tab === 'following' ? t('home', 'followingEmptyDesc') : t('home', 'emptyDesc')
        }
      />
    </div>
  );
}
