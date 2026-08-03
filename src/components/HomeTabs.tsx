'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Waterfall } from './Waterfall';
import { CatsPlaza, type CatCardData } from './CatsPlaza';
import type { Note } from '@/lib/types';

interface HomeTabsProps {
  /** 发现流首屏数据（热度排序或个性化推荐） */
  hotNotes: Note[];
  /** 关注流首屏数据（仅登录时传入） */
  followingNotes?: Note[];
  /** 是否已登录（未登录时关注流提示登录） */
  isLoggedIn?: boolean;
  /** 发现流是否走个性化推荐接口（登录用户） */
  discoverRecommend?: boolean;
  /** 选猫数据 */
  cats?: CatCardData[];
  /** 品种列表 */
  breeds?: string[];
  /** 热门话题（按内容数排序） */
  hotTopics?: Array<{ id: string; name: string; slug: string; count: number }>;
}

type TabKey = 'following' | 'discover' | 'cats';

/** 首页顶部分段：关注 / 发现 / 选猫 */
export function HomeTabs({
  hotNotes,
  followingNotes = [],
  isLoggedIn = false,
  discoverRecommend = false,
  cats = [],
  breeds = [],
  hotTopics = [],
}: HomeTabsProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>('discover');

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'following', label: t('home', 'following') },
    { key: 'discover', label: t('home', 'discover') },
    { key: 'cats', label: t('home', 'pickCat') },
  ];

  return (
    <div>
      {/* 热门话题横条 */}
      {hotTopics.length > 0 && (
        <div className="no-scrollbar -mx-1 mb-3 flex items-center gap-2 overflow-x-auto px-1">
          {hotTopics.map((tp) => (
            <Link
              key={tp.id}
              href={`/topics/${tp.slug}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200/70 bg-white px-3 py-1.5 text-xs font-medium text-stone-500 transition hover:border-brand-400 hover:text-brand-500"
            >
              <span className="text-amber-400">🔥</span>
              #{tp.name}
              <span className="text-[10px] text-stone-400">{tp.count}</span>
            </Link>
          ))}
        </div>
      )}

      {/* 顶部分段控件 */}
      <div className="mb-3 flex items-center justify-center gap-1">
        {tabs.map((tItem) => (
          <button
            key={tItem.key}
            onClick={() => setTab(tItem.key)}
            className={cn(
              'relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              tab === tItem.key ? 'text-brand-600' : 'text-stone-400 hover:text-stone-600'
            )}
          >
            {tItem.label}
            {tab === tItem.key && (
              <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500" />
            )}
          </button>
        ))}
      </div>

      {/* 关注流（保持挂载，切换不重建） */}
      <div className={tab === 'following' ? 'block' : 'hidden'}>
        {!isLoggedIn ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200/60 bg-white py-16 text-center shadow-card">
            <span className="text-4xl">👀</span>
            <p className="font-semibold text-stone-600">{t('home', 'followingLoginTitle')}</p>
            <p className="text-sm text-stone-400">{t('home', 'followingLoginDesc')}</p>
            <Link
              href="/login?next=/"
              className="rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-2 text-sm font-semibold text-[#04281a] shadow-neon-green transition hover:brightness-110"
            >
              {t('home', 'loginToSee')}
            </Link>
          </div>
        ) : (
          <Waterfall
            key={`following-${followingNotes.length}`}
            initialNotes={followingNotes}
            apiFeed="following"
            apiSort="latest"
            emptyTitle={t('home', 'followingEmptyTitle')}
            emptyDescription={t('home', 'followingEmptyDesc')}
          />
        )}
      </div>

      {/* 发现流（保持挂载，切换不重建） */}
      <div className={tab === 'discover' ? 'block' : 'hidden'}>
        <Waterfall
          key={`discover-${hotNotes.length}`}
          initialNotes={hotNotes}
          apiFeed={discoverRecommend ? 'recommend' : 'all'}
          apiSort={discoverRecommend ? 'recommend' : 'hot'}
          showDismiss={discoverRecommend}
          emptyTitle={t('home', 'emptyTitle')}
          emptyDescription={t('home', 'emptyDesc')}
        />
      </div>

      {/* 选猫（保持挂载，切换不重建） */}
      <div className={tab === 'cats' ? 'block' : 'hidden'}>
        <CatsPlaza cats={cats} breeds={breeds} />
      </div>
    </div>
  );
}
