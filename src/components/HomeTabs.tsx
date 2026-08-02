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

      {/* 关注流 */}
      {tab === 'following' &&
        (!isLoggedIn ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200/60 bg-white py-16 text-center shadow-card">
            <span className="text-4xl">👀</span>
            <p className="font-semibold text-stone-600">{t('home', 'followingLoginTitle')}</p>
            <p className="text-sm text-stone-400">{t('home', 'followingLoginDesc')}</p>
            <Link
              href="/login?next=/"
              className="rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-2 text-sm font-semibold text-white shadow-neon-green transition hover:brightness-110"
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
        ))}

      {/* 发现流 */}
      {tab === 'discover' && (
        <Waterfall
          key={`discover-${hotNotes.length}`}
          initialNotes={hotNotes}
          apiFeed={discoverRecommend ? 'recommend' : 'all'}
          apiSort={discoverRecommend ? 'recommend' : 'hot'}
          showDismiss={discoverRecommend}
          emptyTitle={t('home', 'emptyTitle')}
          emptyDescription={t('home', 'emptyDesc')}
        />
      )}

      {/* 选猫 */}
      {tab === 'cats' && <CatsPlaza cats={cats} breeds={breeds} />}
    </div>
  );
}
