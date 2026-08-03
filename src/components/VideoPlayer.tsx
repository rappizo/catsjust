'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { proxyMediaUrl } from '@/lib/mediaUrl';

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
  /** 全屏信息流模式：填满父容器（不圆角、不限高） */
  fill?: boolean;
  /** 是否自动播放（进入/变为可见时播放，离开时暂停） */
  autoPlay?: boolean;
}

/** 视频播放器（原生控件，src 自动走本站 /v 代理以利用 Vercel 全球边缘缓存） */
export function VideoPlayer({ src, poster, fill = false, autoPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const finalSrc = proxyMediaUrl(src);

  // autoPlay 变化：变为可见 → 播放（优先带声，被浏览器拦截则静音重试）；不可见 → 暂停
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!autoPlay) {
      v.pause();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await v.play();
      } catch {
        if (cancelled) return;
        v.muted = true;
        try {
          await v.play();
        } catch {
          /* 忽略播放失败 */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoPlay, src]);

  return (
    <div className={cn('overflow-hidden bg-stone-950', fill ? 'h-full w-full' : 'rounded-2xl')}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={finalSrc}
        poster={poster ?? undefined}
        controls
        playsInline
        preload="auto"
        className={fill ? 'h-full w-full object-contain' : 'max-h-[70vh] w-full'}
      >
        您的浏览器不支持视频播放
      </video>
    </div>
  );
}
