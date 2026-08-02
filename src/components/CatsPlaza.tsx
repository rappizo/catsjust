'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Image as ImageIcon, PawPrint, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Avatar } from './Avatar';

export interface CatCardData {
  id: string;
  name: string;
  breed: string | null;
  gender: string;
  bio: string | null;
  avatar_url: string | null;
  note_count?: number;
  /** 热度：其笔记总点赞数 */
  hot?: number;
  owner?: { id: string; username: string; nickname: string | null; avatar_url: string | null } | null;
}

interface CatsPlazaProps {
  cats: CatCardData[];
  breeds: string[];
}

/** 猫咪广场：品种筛选 + 搜索 + 热门/最新排序 + 猫咪卡片流 */
export function CatsPlaza({ cats, breeds }: CatsPlazaProps) {
  const { t } = useI18n();
  const [breed, setBreed] = useState<string>('全部');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'hot' | 'latest'>('hot');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = cats.filter((c) => {
      if (breed !== '全部' && (c.breed ?? '其他') !== breed) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.breed ?? '').toLowerCase().includes(q) ||
        (c.owner?.nickname ?? '').toLowerCase().includes(q) ||
        (c.owner?.username ?? '').toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => (sort === 'hot' ? (b.hot ?? 0) - (a.hot ?? 0) : 0));
  }, [cats, breed, query, sort]);

  return (
    <div className="space-y-4">
      {/* 搜索 + 排序 */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('cats', 'searchPlaceholder')}
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex shrink-0 gap-1 rounded-xl bg-stone-100 p-1">
          {(
            [
              { key: 'hot', label: t('cats', 'hot') },
              { key: 'latest', label: t('cats', 'latest') },
            ] as { key: 'hot' | 'latest'; label: string }[]
          ).map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                sort === s.key ? 'bg-white text-brand-600 shadow-sm' : 'text-stone-500'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 品种筛选（换行展示全部） */}
      <div className="flex flex-wrap gap-2">
        {['全部', ...breeds].map((b) => (
          <button
            key={b}
            onClick={() => setBreed(b)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
              breed === b
                ? 'bg-brand-500 text-[#04281a]'
                : 'bg-white text-stone-500 ring-1 ring-stone-300 hover:bg-stone-50 hover:text-stone-600'
            )}
          >
            {b}
          </button>
        ))}
      </div>

      {/* 猫咪卡片流 */}
      {!filtered.length ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200/60 bg-white py-16 text-center shadow-card">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-400">
            <PawPrint className="h-7 w-7" />
          </span>
          <p className="font-semibold text-stone-600">{t('cats', 'empty')}</p>
          <p className="text-sm text-stone-400">{t('cats', 'emptyDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((cat) => (
            <Link
              key={cat.id}
              href={`/cats/${cat.id}`}
              className="group overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-gradient-to-br from-brand-100 to-accent-50">
                {cat.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cat.avatar_url}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="text-5xl">🐱</span>
                )}
                {(cat.hot ?? 0) > 0 && (
                  <span className="absolute left-2 top-2 flex items-center gap-0.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
                    🔥 {cat.hot}
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-ink">{cat.name}</p>
                  {cat.note_count !== undefined && (
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-stone-400">
                      <ImageIcon className="h-3 w-3" />
                      {cat.note_count}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {cat.breed && (
                    <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-500">
                      {cat.breed}
                    </span>
                  )}
                  {cat.owner && (
                    <span className="flex min-w-0 items-center gap-1 text-[11px] text-stone-400">
                      <Avatar src={cat.owner.avatar_url} alt={cat.owner.nickname || cat.owner.username} size="sm" className="!h-4 !w-4 !text-[9px]" />
                      <span className="truncate">{cat.owner.nickname || cat.owner.username}</span>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
