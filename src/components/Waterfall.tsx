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
  /** 加载更多的 feed 类型（all / following / recommend） */
  apiFeed?: 'all' | 'following' | 'recommend';
  /** 排序方式（hot / latest / recommend） */
  apiSort?: 'hot' | 'latest' | 'recommend';
  /** 推荐流显示「不感兴趣」按钮 */
  showDismiss?: boolean;
}

/** 双列瀑布流 + 无限滚动 */
export function Waterfall({
  initialNotes,
  emptyTitle = '还没有内容',
  emptyDescription = '成为第一个发布猫咪内容的人吧',
  staticMode = false,
  apiFeed = 'all',
  apiSort = 'latest',
  showDismiss = false,
}: WaterfallProps) {
  const { t } = useI18n();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [hasMore, setHasMore] = useState(!staticMode && initialNotes.length >= 12);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pull, setPull] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const touchStartY = useRef(0);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const last = notes[notes.length - 1];
      if (!last) {
        setHasMore(false);
        return;
      }
      const cursor =
        apiFeed === 'recommend'
          ? JSON.stringify({ offset: notes.length })
          : JSON.stringify(
              apiSort === 'hot'
                ? { hot: (last as Note & { hot_score?: number }).hot_score ?? 0, created_at: last.created_at, id: last.id }
                : { created_at: last.created_at, id: last.id }
            );
      const res = await fetch(`/api/notes?cursor=${encodeURIComponent(cursor)}&limit=12&feed=${apiFeed}&sort=${apiSort}`);
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
  }, [loading, hasMore, notes, apiFeed, apiSort]);

  // 下拉刷新：重新拉取第一页（推荐流会随机扰动排序，得到相似但不完全一样的新内容）
  async function handleRefresh() {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      const qs = new URLSearchParams({ limit: '12', feed: apiFeed, sort: apiSort, refresh: '1' });
      const res = await fetch(`/api/notes?${qs.toString()}`);
      const data = await res.json();
      const fresh: Note[] = data.notes ?? [];
      setNotes(fresh);
      setHasMore(fresh.length >= 12);
    } catch {
      // 刷新失败保留原数据
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }

  // 移动端触摸下拉触发刷新
  useEffect(() => {
    if (staticMode) return;
    let pulling = false;
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY <= 0) {
        touchStartY.current = e.touches[0].clientY;
        pulling = true;
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (!pulling) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (window.scrollY <= 0 && dy > 0) {
        pullRef.current = Math.min(dy * 0.5, 80);
        setPull(pullRef.current);
      }
    }
    function onTouchEnd() {
      if (!pulling) return;
      pulling = false;
      const d = pullRef.current;
      pullRef.current = 0;
      setPull(0);
      if (d > 40) void handleRefresh();
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staticMode, apiFeed, apiSort]);

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
      {/* 下拉刷新指示器 */}
      {(pull > 0 || refreshing) && (
        <div
          className="flex items-center justify-center gap-1.5 text-xs text-stone-400"
          style={{ height: refreshing ? 32 : pull }}
        >
          {refreshing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('home', 'refreshing')}
            </>
          ) : pull > 40 ? (
            t('home', 'releaseRefresh')
          ) : (
            t('home', 'pullRefresh')
          )}
        </div>
      )}
      <div className="masonry">
        {notes.map((note, i) => (
          <NoteCard key={note.id} note={note} priority={i < 4} dismissable={showDismiss} />
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
