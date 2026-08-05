'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { thumbUrl } from '@/lib/img';
import { ImageViewer } from './ImageViewer';
import type { NoteMedia } from '@/lib/types';

interface MediaCarouselProps {
  media: NoteMedia[];
  title?: string | null;
}

/**
 * 图片轮播（多图笔记，高性能拖动版）：
 * - 拖动：图片实时跟手（transform 直接操作 DOM），松手按位移/速度切换或回弹
 * - 切换：旧图滑出、新图从旁边滑入
 * - 点击：从卡片位置无缝放大到全屏查看
 */
export function MediaCarousel({ media, title }: MediaCarouselProps) {
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [enterFrom, setEnterFrom] = useState<1 | -1 | 0>(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const switchingRef = useRef(false);
  const images = media.filter((m) => m.type === 'image');
  const count = images.length;

  // 新图进入动画（切换后从旁边滑入）
  useEffect(() => {
    if (enterFrom === 0) return;
    const el = imgRef.current;
    const c = containerRef.current;
    if (el && c) {
      const w = c.clientWidth;
      el.style.transition = 'none';
      el.style.transform = `translate3d(${enterFrom * w}px, 0, 0)`;
      const timer = setTimeout(() => {
        el.style.transition = 'transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1)';
        el.style.transform = 'translate3d(0, 0, 0)';
      }, 20);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, enterFrom]);

  // 手势：原生非 passive 监听，拖动实时跟手
  useEffect(() => {
    const el = containerRef.current!;
    if (count === 0) return;
    const g = {
      startX: 0,
      startY: 0,
      lastX: 0,
      lastT: 0,
      velX: 0,
      moved: false,
      suppressClick: false,
      dx: 0,
      dy: 0,
    };

    function apply(px: number, animate = false) {
      const img = imgRef.current;
      if (!img) return;
      img.style.transition = animate ? 'transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none';
      img.style.transform = `translate3d(${px}px, 0, 0)`;
    }

    function goNext() {
      if (switchingRef.current) return;
      switchingRef.current = true;
      const w = el.clientWidth;
      apply(-w, true);
      setTimeout(() => {
        setEnterFrom(1);
        setIndex((i) => (i + 1) % count);
        apply(0, false);
        switchingRef.current = false;
      }, 260);
    }

    function goPrev() {
      if (switchingRef.current) return;
      switchingRef.current = true;
      const w = el.clientWidth;
      apply(w, true);
      setTimeout(() => {
        setEnterFrom(-1);
        setIndex((i) => (i - 1 + count) % count);
        apply(0, false);
        switchingRef.current = false;
      }, 260);
    }

    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      g.startX = t.clientX;
      g.startY = t.clientY;
      g.lastX = t.clientX;
      g.lastT = Date.now();
      g.moved = false;
      g.velX = 0;
      g.dx = 0;
      g.dy = 0;
      g.suppressClick = false;
    }

    function onMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - g.startX;
      const dy = t.clientY - g.startY;
      const now = Date.now();
      const dt = now - g.lastT;
      if (dt > 0) g.velX = (t.clientX - g.lastX) / dt;
      g.lastX = t.clientX;
      g.lastT = now;
      g.dx = dx;
      g.dy = dy;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) g.moved = true;
      // 水平拖动为主时：跟手 + 阻止浏览器横向滚动
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
        e.preventDefault();
        apply(dx);
        g.suppressClick = true;
      }
    }

    function onEnd() {
      if (!g.moved) return;
      const w = el.clientWidth;
      const flick = Math.abs(g.velX) > 0.55;
      if (g.dx < -w * 0.25 || (g.dx < -40 && flick && g.velX < 0)) {
        goNext();
      } else if (g.dx > w * 0.25 || (g.dx > 40 && flick && g.velX > 0)) {
        goPrev();
      } else {
        apply(0, true); // 回弹
      }
    }

    function onClick() {
      if (g.suppressClick) {
        g.suppressClick = false;
        return;
      }
      // 点击：记录卡片位置，打开全屏（用于 FLIP 缩放过渡）
      const img = imgRef.current;
      if (img) {
        const r = img.getBoundingClientRect();
        originRectRef.current = { x: r.x, y: r.y, width: r.width, height: r.height };
      }
      setViewerOpen(true);
    }

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });
    el.addEventListener('click', onClick);

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
      el.removeEventListener('click', onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  if (count === 0) return null;

  return (
    <div>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl bg-stone-950"
        style={{ touchAction: 'pan-y' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={index}
          ref={imgRef}
          src={thumbUrl(images[index].url, 1200)}
          alt={`${title ?? '猫咪图片'} ${index + 1}`}
          draggable={false}
          className="max-h-[70vh] w-full cursor-zoom-in select-none object-contain"
          style={{ willChange: 'transform' }}
        />

        {count > 1 && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
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
              onClick={() => {
                setEnterFrom(0);
                setIndex(i);
              }}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                i === index ? 'w-5 bg-brand-500' : 'w-1.5 bg-stone-300 hover:bg-stone-400'
              )}
            />
          ))}
        </div>
      )}

      {/* 全屏查看器（FLIP 缩放过渡 + 捏合缩放 + 跟手拖动） */}
      {viewerOpen && (
        <ImageViewer
          images={images.map((m) => thumbUrl(m.url, 1920))}
          index={index}
          onChangeIndex={setIndex}
          onClose={() => setViewerOpen(false)}
          title={title}
          originRect={originRectRef.current}
        />
      )}
    </div>
  );
}
