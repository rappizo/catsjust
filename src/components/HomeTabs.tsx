'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Waterfall } from './Waterfall';
import type { Note } from '@/lib/types';

interface HomeTabsProps {
  initialNotes: Note[];
}

/** 首页 Tab：推荐 / 最新（P1 两者均为最新排序，为 P2 热度排序预留） */
export function HomeTabs({ initialNotes }: HomeTabsProps) {
  const [tab, setTab] = useState<'recommend' | 'latest'>('recommend');

  const tabs = [
    { key: 'recommend' as const, label: '推荐' },
    { key: 'latest' as const, label: '最新' },
  ];

  return (
    <div>
      <div className="mb-5 flex items-center gap-1 border-b border-stone-200/70">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'relative -mb-px px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t.key ? 'text-brand-600' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500" />
            )}
          </button>
        ))}
      </div>

      <Waterfall
        key={tab}
        initialNotes={initialNotes}
        emptyTitle="还没有猫咪内容"
        emptyDescription="登录后发布第一条猫咪笔记吧"
      />
    </div>
  );
}
