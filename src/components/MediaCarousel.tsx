'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { thumbUrl } from '@/lib/img';
import { ImageViewer } from './ImageViewer';
import type { NoteMedia } from '@/lib/types';

interface MediaCarouselProps {
  media: NoteMedia[];
  title?: string | null;
}

/**
 * 图片轮播（轨道式画廊）：
 * - 轨道含 前/当前/后 三张，拖动实时跟手（transform 直接操作 DOM）
 * - 切换：轨道整体滑动——旧图滑出同时新图从旁边滑入（同屏切换）
 * - 松手按位移/速度决定切换或回弹
 * - 点击：从卡片位置无缝放大到全屏（FLIP）
 */
export function MediaCarousel({ media, title }: MediaCarouselProps) {
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const images = media.filter((m) => m.type === 'image');
  const count = images.length;

  const gRef = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastT: 0,
    velX: 0,
    moved: false,
    suppressClick: false,
    dx: 0,
    animating: false,
  });

  function setTrack(px: number, animate = false) {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none';
    el.style.transform = `translate3d(${px}px, 0, 0)`;
  }

  // Percentage transforms are relative to the track, not the viewport. Center
  // the current slide with its actual width before the browser paints it.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el) setTrack(-el.clientWidth, false);
    gRef.current.animating = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setTrack(-el.clientWidth, false));
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (count === 0) return null;

  const tri = (i: number) => images[((i % count) + count) % count];
  const shown = [tri(index - 1), tri(index), tri(index + 1)];

  // 手势：原生非 passive 监听
  useEffect(() => {
    const el = containerRef.current!;
    if (count === 0) return;
    const g = gRef.current;

    function goNext() {
      if (g.animating) return;
      g.animating = true;
      setTrack(-2 * el.clientWidth, true);
      setTimeout(() => setIndex((i) => (i + 1) % count), 330);
    }
    function goPrev() {
      if (g.animating) return;
      g.animating = true;
      setTrack(0, true);
      setTimeout(() => setIndex((i) => (i - 1 + count) % count), 330);
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
      g.suppressClick = false;
    }
    function onMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - g.startX;
      const now = Date.now();
      const dt = now - g.lastT;
      if (dt > 0) g.velX = (t.clientX - g.lastX) / dt;
      g.lastX = t.clientX;
      g.lastT = now;
      g.dx = dx;
      if (Math.abs(dx) > 6) g.moved = true;
      // 水平拖动为主：跟手 + 阻止横向滚动
      if (Math.abs(dx) > Math.abs(t.clientY - g.startY) && Math.abs(dx) > 8) {
        e.preventDefault();
        setTrack(-el.clientWidth + dx);
        g.suppressClick = true;
      }
    }
    function onEnd() {
      if (!g.moved) return;
      const w = el.clientWidth;
      const flick = Math.abs(g.velX) > 0.55;
      if (g.dx < -w * 0.25 || (g.dx < -40 && flick && g.velX < 0)) goNext();
      else if (g.dx > w * 0.25 || (g.dx > 40 && flick && g.velX > 0)) goPrev();
      else setTrack(-w, true); // 回弹
    }
    function onClick() {
      if (g.suppressClick) {
        g.suppressClick = false;
        return;
      }
      // 记录当前图位置（用于 FLIP）
      const mid = trackRef.current?.children?.[1]?.querySelector('img');
      if (mid) {
        const r = mid.getBoundingClientRect();
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

  return (
    <div>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl bg-stone-950"
        style={{ touchAction: 'pan-y' }}
      >
        {/* 前/当前/后各占容器的一屏宽；当前项由像素位移居中。 */}
        <div
          ref={trackRef}
          className="flex w-full items-center"
          style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}
        >
          {shown.map((img, i) => (
            <div
              key={`${index}-${i}`}
              className="flex shrink-0 items-center justify-center"
              style={{ flexBasis: '100%' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbUrl(img.url, 1200)}
                alt={`${title ?? '猫咪图片'} ${((index + i - 1 + count) % count) + 1}`}
                draggable={false}
                className="block max-h-[70vh] w-full select-none object-contain"
                style={{ willChange: 'transform' }}
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {index + 1} / {count}
          </span>
        )}
      </div>

      {/* 底部小点 */}
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

      {/* 全屏查看器 */}
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
