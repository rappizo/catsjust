'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

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
 * 小红书式全屏图片查看器（高性能手势版）：
 * - 打开/关闭：从点击的卡片位置无缝放大到全屏 / 缩回原位（FLIP 过渡，不闪屏）
 * - 拖动：单指实时跟手（transform 直接操作 DOM，无 React 重渲染）
 * - 缩放：双指捏合（1x ~ 4x），缩放后单指平移，边界回弹
 * - 切换：scale=1 时左滑下一张 / 右滑上一张（相邻图滑入），第一张右滑返回
 * - 双击放大/还原；点击关闭
 */
export function ImageViewer({ images, index, onChangeIndex, onClose, title, originRect }: ImageViewerProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [enterFrom, setEnterFrom] = useState<1 | -1 | 0>(0);

  const indexRef = useRef(index);
  indexRef.current = index;
  const countRef = useRef(images.length);
  countRef.current = images.length;

  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const switchingRef = useRef(false);

  // 打开动画：从 originRect 无缝放大到全屏（FLIP）
  useEffect(() => {
    const c = containerRef.current;
    const img = imgRef.current;
    const id = setTimeout(() => {
      if (img && c) {
        const cw = c.clientWidth;
        const ch = c.clientHeight;
        let sx = 0.92;
        let ox = 0;
        let oy = 0;
        let op = 0.5;
        if (originRect) {
          sx = clamp(Math.min(originRect.width / cw, originRect.height / ch), 0.12, 1);
          ox = originRect.x + originRect.width / 2 - cw / 2;
          oy = originRect.y + originRect.height / 2 - ch / 2;
        }
        img.style.transition = 'none';
        img.style.transform = `translate3d(${ox}px, ${oy}px, 0) scale(${sx})`;
        img.style.opacity = String(op);
        setTimeout(() => {
          img.style.transition = 'transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.3s ease';
          img.style.transform = 'translate3d(0, 0, 0) scale(1)';
          img.style.opacity = '1';
        }, 20);
      }
    }, 20);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(id);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 新图进入动画（切换后，从旁边滑入）
  useEffect(() => {
    if (enterFrom === 0) return;
    const c = containerRef.current;
    const img = imgRef.current;
    if (img && c) {
      const w = c.clientWidth;
      img.style.transition = 'none';
      img.style.transform = `translate3d(${enterFrom * w}px, 0, 0) scale(1)`;
      const timer = setTimeout(() => {
        img.style.transition = 'transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1)';
        img.style.transform = 'translate3d(0, 0, 0) scale(1)';
      }, 20);
      scaleRef.current = 1;
      txRef.current = 0;
      tyRef.current = 0;
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, enterFrom]);

  const apply = useCallback((scale: number, tx: number, ty: number, animate = false) => {
    const img = imgRef.current;
    if (!img) return;
    img.style.transition = animate ? 'transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none';
    img.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
  }, []);

  const bounce = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const s = scaleRef.current;
    const maxTx = ((s - 1) * c.clientWidth) / 2;
    const maxTy = ((s - 1) * c.clientHeight) / 2;
    txRef.current = clamp(txRef.current, -maxTx, maxTx);
    tyRef.current = clamp(tyRef.current, -maxTy, maxTy);
    apply(s, txRef.current, tyRef.current, true);
  }, [apply]);

  const close = useCallback(() => {
    const c = containerRef.current;
    const img = imgRef.current;
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
  }, [onClose, originRect]);

  const goNext = useCallback(() => {
    if (switchingRef.current || countRef.current <= 1) return;
    const c = containerRef.current;
    if (!c) return;
    switchingRef.current = true;
    const w = c.clientWidth;
    apply(1, -w, 0, true);
    setTimeout(() => {
      setEnterFrom(1);
      onChangeIndex((indexRef.current + 1) % countRef.current);
      switchingRef.current = false;
    }, 250);
  }, [apply, onChangeIndex]);

  const goPrev = useCallback(() => {
    if (switchingRef.current || countRef.current <= 1) return;
    const c = containerRef.current;
    if (!c) return;
    switchingRef.current = true;
    const w = c.clientWidth;
    apply(1, w, 0, true);
    setTimeout(() => {
      setEnterFrom(-1);
      onChangeIndex((indexRef.current - 1 + countRef.current) % countRef.current);
      switchingRef.current = false;
    }, 250);
  }, [apply, onChangeIndex]);

  // 手势：原生非 passive 监听，transform 直接操作 DOM（60fps 跟手）
  useEffect(() => {
    const el = containerRef.current!;
    const g = {
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
    };

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
        apply(ns, txRef.current, tyRef.current, false);
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
          // 缩放态：单指平移（边界 clamp）
          e.preventDefault();
          const nx = g.startTx + dx;
          const ny = g.startTy + dy;
          const maxTx = ((scaleRef.current - 1) * el.clientWidth) / 2;
          const maxTy = ((scaleRef.current - 1) * el.clientHeight) / 2;
          txRef.current = clamp(nx, -maxTx, maxTx);
          tyRef.current = clamp(ny, -maxTy, maxTy);
          apply(scaleRef.current, txRef.current, tyRef.current, false);
        } else {
          // 缩放=1：水平拖动跟手（用于切换）
          e.preventDefault();
          txRef.current = dx;
          apply(1, dx, 0, false);
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
            txRef.current = 0;
            tyRef.current = 0;
            apply(1, 0, 0, true);
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
        apply(ns, txRef.current, tyRef.current, true);
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
  }, [apply, bounce, close, goNext, goPrev]);

  if (images.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black/95"
      style={{ touchAction: 'none' }}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? '图片查看'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={index}
        ref={imgRef}
        src={images[index]}
        alt={`${title ?? '图片'} ${index + 1}`}
        draggable={false}
        className="max-h-full max-w-full select-none object-contain"
        style={{ willChange: 'transform' }}
      />

      {/* 右上角计数 */}
      <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
        {index + 1} / {images.length}
      </span>

      {/* 底部小点 */}
      {images.length > 1 && (
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
