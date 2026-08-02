'use client';

import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
  /** 全屏信息流模式：填满父容器（不圆角、不限高） */
  fill?: boolean;
}

/** 视频播放器（原生控件） */
export function VideoPlayer({ src, poster, fill = false }: VideoPlayerProps) {
  return (
    <div className={cn('overflow-hidden bg-stone-950', fill ? 'h-full w-full' : 'rounded-2xl')}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={src}
        poster={poster ?? undefined}
        controls
        playsInline
        preload="metadata"
        className={fill ? 'h-full w-full object-contain' : 'max-h-[70vh] w-full'}
      >
        您的浏览器不支持视频播放
      </video>
    </div>
  );
}
