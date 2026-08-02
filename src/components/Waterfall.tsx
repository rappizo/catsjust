'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Cat as CatIcon } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Note } from '@/lib/types';
import { NoteCard } from './NoteCard';

interface WaterfallProps {
  initialNotes: Note[];
  emptyTitle?: string;
  emptyDescription?: string;
  /** 附加过滤条件（如按用户/猫咪/话题筛选时，本组件不做加载更多） */
  staticMode?: boolean;
  /** 加载更多的 feed 类型（all / following） */
  apiFeed?: 'all' | 'following';
}

/** 双列瀑布流 + 无限滚动 */
export function Waterfall({
  initialNotes,
  emptyTitle = '还没有内容',
  emptyDescription = '成为第一个发布猫咪内容的人吧',
  staticMode = false,
  apiFeed = 'all',
}: WaterfallProps) {
  const { t } = useI18n();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [hasMore, setHasMore] = useState(!staticMode && initialNotes.length >= 12);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const last = notes[notes.length - 1];
      if (!last) {
        setHasMore(false);
        return;
      }
      const cursor = JSON.stringify({ created_at: last.created_at, id: last.id });
      const res = await fetch(`/api/notes?cursor=${encodeURIComponent(cursor)}&limit=12&feed=${apiFeed}`);
      const data = await res.json();
      const newNotes: Note[] = data.notes ?? [];
      setNotes((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...newNotes.filter((n) => !seen.has(n.id))];
      });
      if (newNotes.length < 12) setHasMore(false);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, notes, apiFeed]);

  useEffect(() => {
    if (staticMode) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '400px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, staticMode]);

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-400">
          <CatIcon className="h-8 w-8" />
        </span>
        <p className="font-semibold text-stone-600">{emptyTitle}</p>
        <p className="text-sm text-stone-400">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <>
      <div className="masonry">
        {notes.map((note, i) => (
          <NoteCard key={note.id} note={note} priority={i < 4} />
        ))}
      </div>

      {!staticMode && (
        <div ref={sentinelRef} className="flex items-center justify-center py-8">
          {loading && (
            <span className="flex items-center gap-2 text-sm text-stone-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common', 'loading')}
            </span>
          )}
          {!hasMore && notes.length > 0 && (
            <span className="text-xs text-stone-300">{t('home', 'end')}</span>
          )}
        </div>
      )}
    </>
  );
}
