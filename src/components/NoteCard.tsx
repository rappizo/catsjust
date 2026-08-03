'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Loader2, MessageCircle, Play, X } from 'lucide-react';
import type { Note } from '@/lib/types';
import { cn, formatCount } from '@/lib/utils';
import { thumbUrl } from '@/lib/img';
import { useI18n } from '@/lib/i18n';
import { addNotInterested } from '@/lib/actions/interests';
import { Avatar } from './Avatar';

interface NoteCardProps {
  note: Note;
  priority?: boolean;
  /** 推荐流中显示「不感兴趣」按钮 */
  dismissable?: boolean;
}

export function NoteCard({ note, priority = false, dismissable = false }: NoteCardProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [dismissing, setDismissing] = useState(false);
  const cover = note.cover_url || note.media?.[0]?.url;
  const isVideo = note.media_type === 'video';
  const authorName = note.author?.nickname || note.author?.username || t('note', 'authorFallback');

  async function handleDismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (dismissing) return;
    setDismissing(true);
    await addNotInterested(note.id);
    router.refresh();
  }

  return (
    <Link
      href={`/notes/${note.id}`}
      className="masonry-item group block overflow-hidden rounded-xl border border-stone-200/60 bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      {/* 封面 */}
      <div className="relative w-full overflow-hidden bg-stone-100">
        {dismissable && (
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-black/60"
            aria-label={t('home', 'notInterested')}
            title={t('home', 'notInterested')}
          >
            {dismissing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          </button>
        )}
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl(cover, 640)}
            alt={note.title || '猫咪笔记'}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 text-4xl">
            🐱
          </div>
        )}

        {/* 视频角标 */}
        {isVideo && (
          <span className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
            <Play className="h-4 w-4 fill-white" />
          </span>
        )}

        {/* 底部渐变 + 互动数 */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-3 bg-gradient-to-t from-black/55 to-transparent px-3 pb-2 pt-10 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="flex items-center gap-1 text-xs font-medium">
            <Heart className="h-3.5 w-3.5 fill-white" />
            {formatCount(note.like_count)}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium">
            <MessageCircle className="h-3.5 w-3.5 fill-white" />
            {formatCount(note.comment_count)}
          </span>
        </div>
      </div>

      {/* 标题 */}
      {note.title && (
        <p className="line-clamp-2 px-2.5 pt-2 text-sm font-medium leading-snug text-ink">
          {note.title}
        </p>
      )}

      {/* 作者与猫咪 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2.5 pb-2.5 pt-1.5">
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <Avatar src={note.author?.avatar_url} alt={authorName} size="sm" />
          <span className="min-w-0 truncate text-xs text-stone-500">{authorName}</span>
        </span>
        {note.cat && (
          <span
            className={cn(
              'shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-600'
            )}
          >
            🐾 {note.cat.name}
          </span>
        )}
        {note.cat?.breed && (
          <span className="shrink-0 rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-400">
            #{note.cat.breed}
          </span>
        )}
      </div>
    </Link>
  );
}
