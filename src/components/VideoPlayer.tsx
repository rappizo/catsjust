'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
  /** 全屏信息流模式：填满父容器（不圆角、不限高） */
  fill?: boolean;
  /** 是否自动播放（进入/变为可见时播放，离开时暂停） */
  autoPlay?: boolean;
}

/** 视频播放器（原生控件 + 静音开关，最简实现） */
export function VideoPlayer({ src, poster, fill = false, autoPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);

  // autoPlay 变化：变为可见 → 先尝试带声播放（桌面浏览器允许），
  // 被浏览器拦截（如手机端不允许带声自动播放）→ 才回退为静音播放；不可见 → 暂停
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
        setMuted(true);
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

  // 同步静音状态：用户用原生控件（controls）的静音按钮时图标也能跟上
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onVolumeChange = () => setMuted(v.muted);
    v.addEventListener('volumechange', onVolumeChange);
    return () => v.removeEventListener('volumechange', onVolumeChange);
  }, [src]);

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
    if (!next) {
      // 用户开声时确保继续播放
      const p = v.play();
      if (p) p.catch(() => {});
    }
  }

  return (
    <div className={cn('relative overflow-hidden bg-stone-950', fill ? 'h-full w-full' : 'rounded-2xl')}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        controls
        playsInline
        preload="auto"
        className={fill ? 'h-full w-full object-contain' : 'max-h-[70vh] w-full'}
      >
        您的浏览器不支持视频播放
      </video>

      {/* 静音开关：信息流在右上（头部下方），详情页在右下（原生控件上方） */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? '取消静音' : '静音'}
        className={cn(
          'absolute z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 active:scale-95',
          fill ? 'right-4 top-32' : 'bottom-14 right-3'
        )}
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
    </div>
  );
}
