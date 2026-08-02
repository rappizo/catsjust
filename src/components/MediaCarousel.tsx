'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NoteMedia } from '@/lib/types';

interface MediaCarouselProps {
  media: NoteMedia[];
  title?: string | null;
}

/** 图片轮播（多图笔记） */
export function MediaCarousel({ media, title }: MediaCarouselProps) {
  const [index, setIndex] = useState(0);
  const images = media.filter((m) => m.type === 'image');
  const count = images.length;

  if (count === 0) return null;

  const current = images[index];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-stone-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url}
        alt={`${title ?? '猫咪图片'} ${index + 1}`}
        className="max-h-[70vh] w-full object-contain"
      />

      {count > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
            aria-label="上一张"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % count)}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
            aria-label="下一张"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {index + 1} / {count}
          </span>
        </>
      )}

      {/* 缩略图 */}
      {count > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto bg-stone-900 px-3 py-2">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              onClick={() => setIndex(i)}
              className={cn(
                'h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition',
                i === index ? 'border-brand-500' : 'border-transparent opacity-60 hover:opacity-100'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
