'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ImageViewerProps {
  /** 大图 URL 列表 */
  images: string[];
  /** 当前展示索引 */
  index: number;
  onChangeIndex: (i: number) => void;
  onClose: () => void;
  title?: string | null;
}

/**
 * 小红书式全屏图片查看器：
 * - 打开时图片从卡片位置放大到全屏（scale 0.9 → 1 + 淡入）
 * - 关闭时缩小回原卡片（scale 1 → 0.9 + 淡出）
 * - 左滑下一张 / 右滑上一张；下滑或点击背景关闭；第一张右滑返回
 */
export function ImageViewer({ images, index, onChangeIndex, onClose, title }: ImageViewerProps) {
  const [visible, setVisible] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // 挂载后立即触发打开动画（用 setTimeout 而非 rAF：后台页面 rAF 可能被暂停）
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 20);
    // 打开时锁定页面滚动，关闭后恢复
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(id);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const count = images.length;

  function close() {
    if (!visible) return;
    setVisible(false);
    // 等待缩小动画结束后卸载
    setTimeout(onClose, 260);
  }

  function goNext() {
    if (count <= 1) return;
    onChangeIndex((index + 1) % count);
  }
  function goPrev() {
    if (count <= 1) return;
    onChangeIndex((index - 1 + count) % count);
  }

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
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        goNext(); // 左滑下一张
      } else if (index === 0) {
        close(); // 第一张右滑返回（缩小回卡片）
      } else {
        goPrev(); // 右滑上一张
      }
    } else if (dy > 60) {
      close(); // 下滑关闭
    }
  }

  if (count === 0) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[70] flex items-center justify-center bg-black/95 transition-opacity duration-250',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      style={{ touchAction: 'none' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? '图片查看'}
    >
      {/* 大图：缩放式过渡 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[index]}
        alt={`${title ?? '图片'} ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'max-h-full max-w-full object-contain transition-all duration-250 ease-out',
          visible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        )}
      />

      {/* 右上角计数 */}
      <span className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
        {index + 1} / {count}
      </span>

      {/* 底部小点 */}
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`第 ${i + 1} 张`}
              onClick={(e) => {
                e.stopPropagation();
                onChangeIndex(i);
              }}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
              )}
            />
          ))}
        </div>
      )}

      {/* 关闭提示 */}
      <span className="absolute bottom-16 left-1/2 -translate-x-1/2 text-xs text-white/50">
        下滑或点击关闭
      </span>
    </div>
  );
}
