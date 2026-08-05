'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { thumbUrl } from '@/lib/img';

interface ImageViewerProps {
  /** 大图 URL 列表 */
  images: string[];
  /** 当前展示索引 */
  index: number;
  onChangeIndex: (i: number) => void;
  onClose: () => void;
  title?: string | null;
  /** 触发点（点击的卡片图片）位置，用于打开/关闭的无缝缩放过渡 */
  originRect?: { x: number; y: number; width: number; height: number } | null;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * 小红书式全屏图片查看器（轨道式 + 缩放 + 无痕过渡）：
 * - 打开：先显示卡片同源 1200 图（缓存命中、零等待），从卡片位置无缝放大到全屏，
 *   同时后台预加载 1920 高清后平滑升级——毫无痕迹
 * - 切换：轨道整体滑动，旧图滑出同时新图从旁滑入（同屏切换）
 * - 缩放：双指捏合（1x~4x）+ 缩放后单指平移 + 边界回弹 + 双击放大
 * - 关闭：缩回卡片原位（FLIP）
 */
export function ImageViewer({ images, index, onChangeIndex, onClose, title, originRect }: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const curImgRef = useRef<HTMLImageElement>(null);
  const [curSrc, setCurSrc] = useState<string>(thumbUrl(images[index], 1200));

  const indexRef = useRef(index);
  indexRef.current = index;
  const count = images.length;

  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const closingRef = useRef(false);
  const mountedRef = useRef(false);

  const gRef = useRef({
    mode: 'none' as 'none' | 'pan' | 'pinch',
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
    startDist: 1,
    startScale: 1,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    velX: 0,
    moved: false,
    suppressClick: false,
    finalDx: 0,
    lastTapT: 0,
    animating: false,
  });

  function setTrack(px: number, animate = false) {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none';
    el.style.transform = `translate3d(${px}px, 0, 0)`;
  }
  function applyCur(scale: number, tx: number, ty: number, animate = false) {
    const img = curImgRef.current;
    if (!img) return;
    img.style.transition = animate ? 'transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none';
    img.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
  }
  function loadHi(i: number) {
    const hi = new Image();
    hi.src = thumbUrl(images[i], 1920);
    hi.onload = () => {
      if (indexRef.current === i) setCurSrc(thumbUrl(images[i], 1920));
    };
  }

  // 打开：FLIP 从卡片位放大 + 后台预加载高清
  useEffect(() => {
    const c = containerRef.current;
    const img = curImgRef.current;
    const id = setTimeout(() => {
      if (img && c) {
        const cw = c.clientWidth;
        const ch = c.clientHeight;
        let sx = 0.92;
        let ox = 0;
        let oy = 0;
        if (originRect) {
          sx = clamp(Math.min(originRect.width / cw, originRect.height / ch), 0.12, 1);
          ox = originRect.x + originRect.width / 2 - cw / 2;
          oy = originRect.y + originRect.height / 2 - ch / 2;
        }
        img.style.transition = 'none';
        img.style.transform = `translate3d(${ox}px, ${oy}px, 0) scale(${sx})`;
        img.style.opacity = '0.5';
        setTimeout(() => {
          img.style.transition = 'transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.3s ease';
          img.style.transform = 'translate3d(0, 0, 0) scale(1)';
          img.style.opacity = '1';
        }, 20);
      }
    }, 20);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(id);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 预加载高清（首次）
  useEffect(() => {
    loadHi(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // index 变化：轨道复位 + 重置缩放 + 预加载高清
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const c = containerRef.current;
    if (c) setTrack(-c.clientWidth, false);
    gRef.current.animating = false;
    scaleRef.current = 1;
    txRef.current = 0;
    tyRef.current = 0;
    setCurSrc(thumbUrl(images[index], 1200));
    loadHi(index);
    const img = curImgRef.current;
    if (img) applyCur(1, 0, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function goNext() {
    if (gRef.current.animating) return;
    gRef.current.animating = true;
    const c = containerRef.current;
    if (!c) return;
    setTrack(-2 * c.clientWidth, true);
    setTimeout(() => onChangeIndex((indexRef.current + 1) % count), 330);
  }
  function goPrev() {
    if (gRef.current.animating) return;
    gRef.current.animating = true;
    const c = containerRef.current;
    if (!c) return;
    setTrack(0, true);
    setTimeout(() => onChangeIndex((indexRef.current - 1 + count) % count), 330);
  }

  function bounce() {
    const c = containerRef.current;
    if (!c) return;
    const s = scaleRef.current;
    const maxTx = ((s - 1) * c.clientWidth) / 2;
    const maxTy = ((s - 1) * c.clientHeight) / 2;
    txRef.current = clamp(txRef.current, -maxTx, maxTx);
    tyRef.current = clamp(tyRef.current, -maxTy, maxTy);
    applyCur(s, txRef.current, tyRef.current, true);
  }

  function close() {
    if (closingRef.current) return;
    closingRef.current = true;
    const c = containerRef.current;
    const img = curImgRef.current;
    if (img && c && originRect) {
      const cw = c.clientWidth;
      const ch = c.clientHeight;
      const sx = clamp(Math.min(originRect.width / cw, originRect.height / ch), 0.12, 1);
      const ox = originRect.x + originRect.width / 2 - cw / 2;
      const oy = originRect.y + originRect.height / 2 - ch / 2;
      img.style.transition = 'transform 0.26s cubic-bezier(0.55, 0, 0.55, 0.2), opacity 0.26s ease';
      img.style.transform = `translate3d(${ox}px, ${oy}px, 0) scale(${sx})`;
      img.style.opacity = '0';
      setTimeout(onClose, 280);
    } else if (img) {
      img.style.transition = 'opacity 0.2s ease';
      img.style.opacity = '0';
      setTimeout(onClose, 200);
    } else {
      onClose();
    }
  }

  // 手势：原生非 passive 监听
  useEffect(() => {
    const el = containerRef.current!;
    const g = gRef.current;

    function onStart(e: TouchEvent) {
      const ts = e.touches;
      g.suppressClick = false;
      g.moved = false;
      if (ts.length === 1) {
        g.mode = 'pan';
        g.startX = ts[0].clientX;
        g.startY = ts[0].clientY;
        g.startTx = txRef.current;
        g.startTy = tyRef.current;
        g.lastX = ts[0].clientX;
        g.lastY = ts[0].clientY;
        g.lastT = Date.now();
        g.velX = 0;
      } else if (ts.length === 2) {
        g.mode = 'pinch';
        const dx = ts[0].clientX - ts[1].clientX;
        const dy = ts[0].clientY - ts[1].clientY;
        g.startDist = Math.hypot(dx, dy) || 1;
        g.startScale = scaleRef.current;
      }
    }

    function onMove(e: TouchEvent) {
      const ts = e.touches;
      if (ts.length === 2 && g.mode === 'pinch') {
        e.preventDefault();
        g.moved = true;
        g.suppressClick = true;
        const dx = ts[0].clientX - ts[1].clientX;
        const dy = ts[0].clientY - ts[1].clientY;
        const dist = Math.hypot(dx, dy) || 1;
        const ns = clamp((g.startScale * dist) / g.startDist, 1, 4);
        scaleRef.current = ns;
        applyCur(ns, txRef.current, tyRef.current, false);
      } else if (ts.length === 1 && g.mode === 'pan') {
        const x = ts[0].clientX;
        const y = ts[0].clientY;
        const dx = x - g.startX;
        const dy = y - g.startY;
        const now = Date.now();
        const dt = now - g.lastT;
        if (dt > 0) g.velX = (x - g.lastX) / dt;
        g.lastX = x;
        g.lastY = y;
        g.lastT = now;
        g.finalDx = dx;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          g.moved = true;
          g.suppressClick = true;
        }
        if (scaleRef.current > 1.02) {
          // 缩放态：平移
          e.preventDefault();
          const nx = g.startTx + dx;
          const ny = g.startTy + dy;
          const maxTx = ((scaleRef.current - 1) * el.clientWidth) / 2;
          const maxTy = ((scaleRef.current - 1) * el.clientHeight) / 2;
          txRef.current = clamp(nx, -maxTx, maxTx);
          tyRef.current = clamp(ny, -maxTy, maxTy);
          applyCur(scaleRef.current, txRef.current, tyRef.current, false);
        } else {
          // 缩放=1：轨道拖动跟手
          e.preventDefault();
          setTrack(-el.clientWidth + dx);
        }
      }
    }

    function onEnd() {
      const w = el.clientWidth;
      if (g.mode === 'pinch') {
        if (scaleRef.current > 1.02) bounce();
        g.mode = 'none';
        return;
      }
      if (g.mode === 'pan') {
        if (scaleRef.current > 1.02) {
          bounce();
        } else {
          const dx = g.finalDx;
          const flick = Math.abs(g.velX) > 0.55;
          if (g.moved && (dx < -w * 0.25 || (dx < -40 && flick && g.velX < 0))) {
            goNext();
          } else if (g.moved && (dx > w * 0.25 || (dx > 40 && flick && g.velX > 0))) {
            if (indexRef.current === 0) close();
            else goPrev();
          } else {
            setTrack(-w, true); // 回弹
          }
        }
        g.mode = 'none';
      }
      // 双击检测
      const now = Date.now();
      if (!g.moved && now - g.lastTapT < 260) {
        const ns = scaleRef.current > 1.2 ? 1 : 2.5;
        scaleRef.current = ns;
        if (ns === 1) {
          txRef.current = 0;
          tyRef.current = 0;
        }
        applyCur(ns, txRef.current, tyRef.current, true);
        g.lastTapT = 0;
      } else if (!g.moved) {
        g.lastTapT = now;
      }
    }

    function onClick() {
      if (g.suppressClick) {
        g.suppressClick = false;
        return;
      }
      close();
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
  }, []);

  if (count === 0) return null;

  const tri = (i: number) => images[((i % count) + count) % count];
  const shown = [tri(index - 1), tri(index), tri(index + 1)];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[70] overflow-hidden bg-black/95"
      style={{ touchAction: 'none' }}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? '图片查看'}
    >
      {/* 轨道：前/当前/后 */}
      <div
        ref={trackRef}
        className="flex h-full"
        style={{ transform: 'translate3d(-100vw,0,0)', willChange: 'transform' }}
      >
        {shown.map((img, i) => (
          <div key={`${index}-${i}`} className="flex h-full w-screen shrink-0 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={i === 1 ? curImgRef : null}
              src={i === 1 ? curSrc : thumbUrl(img, 1200)}
              alt={`${title ?? '图片'} ${((index + i - 1 + count) % count) + 1}`}
              draggable={false}
              className="max-h-full max-w-full select-none object-contain"
              style={i === 1 ? { willChange: 'transform' } : undefined}
            />
          </div>
        ))}
      </div>

      {/* 右上角计数 */}
      <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
        {index + 1} / {count}
      </span>

      {/* 底部小点 */}
      {count > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex items-center justify-center gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
              )}
            />
          ))}
        </div>
      )}

      <span className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 text-xs text-white/50">
        捏合缩放 · 双击放大 · 点击关闭
      </span>
    </div>
  );
}
