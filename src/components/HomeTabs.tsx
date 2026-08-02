'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Waterfall } from './Waterfall';
import type { Note } from '@/lib/types';

interface HomeTabsProps {
  initialNotes: Note[];
}

/** 首页 Tab：推荐 / 最新（P1 两者均为最新排序，为 P2 热度排序预留） */
export function HomeTabs({ initialNotes }: HomeTabsProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<'recommend' | 'latest'>('recommend');

  const tabs = [
    { key: 'recommend' as const, label: t('home', 'recommend') },
    { key: 'latest' as const, label: t('home', 'latest') },
  ];

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
        key={tab}
        initialNotes={initialNotes}
        emptyTitle={t('home', 'emptyTitle')}
        emptyDescription={t('home', 'emptyDesc')}
      />
    </div>
  );
}
