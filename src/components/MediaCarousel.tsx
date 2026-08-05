'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { thumbUrl } from '@/lib/img';
import { ImageViewer } from './ImageViewer';
import type { NoteMedia } from '@/lib/types';

interface MediaCarouselProps {
  media: NoteMedia[];
  title?: string | null;
}

/** 图片轮播（多图笔记）：左滑下一张 / 右滑上一张，底部小点，点击放大全屏查看 */
export function MediaCarousel({ media, title }: MediaCarouselProps) {
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const images = media.filter((m) => m.type === 'image');
  const count = images.length;

  if (count === 0) return null;

  const current = images[index];

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const s = touchStart.current;
    touchStart.current = null;
    const t = e.changedTouches[0];
    if (!s || !t) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    // 水平滑动切换（避免与页面纵向滚动冲突）
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) setIndex((i) => (i + 1) % count); // 左滑下一张
      else setIndex((i) => (i - 1 + count) % count); // 右滑上一张
    }
  }

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-2xl bg-stone-950"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="block w-full cursor-zoom-in"
          aria-label="放大查看图片"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbUrl(current.url, 1200)}
            alt={`${title ?? '猫咪图片'} ${index + 1}`}
            className="max-h-[70vh] w-full object-contain"
          />
        </button>

        {/* 角标 */}
        {count > 1 && (
          <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {index + 1} / {count}
          </span>
        )}
      </div>

      {/* 底部小点（无箭头，左右滑动切换） */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`第 ${i + 1} 张`}
              onClick={() => setIndex(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                i === index ? 'w-5 bg-brand-500' : 'w-1.5 bg-stone-300 hover:bg-stone-400'
              )}
            />
          ))}
        </div>
      )}

      {/* 全屏查看器（小红书式放大/缩小过渡） */}
      {viewerOpen && (
        <ImageViewer
          images={images.map((m) => thumbUrl(m.url, 1920))}
          index={index}
          onChangeIndex={setIndex}
          onClose={() => setViewerOpen(false)}
          title={title}
        />
      )}
    </div>
  );
}
