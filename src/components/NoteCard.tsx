'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Play } from 'lucide-react';
import type { Note } from '@/lib/types';
import { cn, formatCount } from '@/lib/utils';
import { Avatar } from './Avatar';

interface NoteCardProps {
  note: Note;
  priority?: boolean;
}

export function NoteCard({ note, priority = false }: NoteCardProps) {
  const cover = note.cover_url || note.media?.[0]?.url;
  const isVideo = note.media_type === 'video';
  const authorName = note.author?.nickname || note.author?.username || '喵友';

  return (
    <Link
      href={`/notes/${note.id}`}
      className="masonry-item group block overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      {/* 封面 */}
      <div className="relative w-full overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={note.title || '猫咪笔记'}
            loading={priority ? 'eager' : 'lazy'}
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
        <p className="line-clamp-2 px-3 pt-2.5 text-sm font-medium leading-snug text-ink">
          {note.title}
        </p>
      )}

      {/* 作者与猫咪 */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-2">
        <Avatar src={note.author?.avatar_url} alt={authorName} size="sm" />
        <span className="min-w-0 flex-1 truncate text-xs text-stone-500">{authorName}</span>
        {note.cat && (
          <span
            className={cn(
              'shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-600'
            )}
          >
            🐾 {note.cat.name}
          </span>
        )}
      </div>
    </Link>
  );
}
