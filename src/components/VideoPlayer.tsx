'use client';

import { Loader2, Play, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { proxyMediaUrl } from '@/lib/mediaUrl';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
  /** Full-screen feed mode. Only the active feed item loads its video source. */
  fill?: boolean;
  /** Start playback once this video is the active feed item. */
  autoPlay?: boolean;
}

type PlaybackStatus = 'idle' | 'loading' | 'ready' | 'failed';

/**
 * Native video player with mobile-safe autoplay and a second delivery path.
 * Public Storage URLs are tried first; if a WebView rejects that request, the
 * same file is retried through the app's media proxy.
 */
export function VideoPlayer({ src, poster, fill = false, autoPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Supabase 直链优先（手机播放器兼容性最佳，用户以前可正常播放）；/v/ 代理兜底
  const primarySource = src;
  const proxySource = useMemo(() => proxyMediaUrl(src), [src]);
  const [source, setSource] = useState(primarySource);
  const [usingFallback, setUsingFallback] = useState(false);
  const [status, setStatus] = useState<PlaybackStatus>(src ? 'loading' : 'failed');
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // A feed can contain many videos. Keeping source off inactive entries avoids
  // concurrent downloads that starve the currently visible video on mobile.
  const shouldLoadSource = Boolean(src) && (!fill || autoPlay);

  useEffect(() => {
    setSource(primarySource);
    setUsingFallback(false);
    setStatus(primarySource ? 'loading' : 'failed');
    setNeedsManualPlay(false);
    setRetryKey(0);
  }, [primarySource]);

  const startPlayback = useCallback(
    async (userInitiated = false) => {
      const video = videoRef.current;
      if (!video || !shouldLoadSource) return;

      // iOS/WKWebView requires muted autoplay to be declared before playback,
      // not only after play() has already been rejected.
      video.muted = autoPlay && !userInitiated;
      try {
        await video.play();
        setNeedsManualPlay(false);
      } catch {
        // The native controls remain available; the overlay makes the fallback
        // explicit on WebViews that still require a user gesture.
        setNeedsManualPlay(true);
      }
    },
    [autoPlay, shouldLoadSource]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!shouldLoadSource) {
      video.pause();
      return;
    }
    if (autoPlay) void startPlayback();
  }, [autoPlay, shouldLoadSource, source, retryKey, startPlayback]);

  function handleReady() {
    setStatus('ready');
    if (autoPlay) void startPlayback();
  }

  function handleError() {
    if (!usingFallback && proxySource && proxySource !== primarySource) {
      setUsingFallback(true);
      setSource(proxySource);
      setStatus('loading');
      return;
    }
    setStatus('failed');
    setNeedsManualPlay(false);
  }

  const handleReadyRef = useRef(handleReady);
  handleReadyRef.current = handleReady;
  const handleErrorRef = useRef(handleError);
  handleErrorRef.current = handleError;

  // 兜底：某些环境 canplay/loadeddata 事件可能不派发（后台 WebView 等），
  // 轮询 readyState >= 3 确保不卡在「加载中」
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoadSource) return;
    let cancelled = false;
    let timer = 0;
    const poll = () => {
      if (cancelled) return;
      if (video.error) {
        handleErrorRef.current();
        return;
      }
      if (video.readyState >= 3) {
        handleReadyRef.current();
        return;
      }
      timer = window.setTimeout(poll, 400);
    };
    timer = window.setTimeout(poll, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [source, retryKey, shouldLoadSource]);

  function retry() {
    setUsingFallback(false);
    setSource(primarySource);
    setStatus(primarySource ? 'loading' : 'failed');
    setNeedsManualPlay(false);
    setRetryKey((key) => key + 1);
  }

  const playerClass = fill ? 'h-full w-full object-contain' : 'block max-h-[70vh] w-full';

  return (
    <div className={cn('relative overflow-hidden bg-stone-950', fill ? 'h-full w-full' : 'rounded-2xl')}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        key={`${source}-${retryKey}`}
        ref={videoRef}
        src={shouldLoadSource ? source : undefined}
        poster={poster ?? undefined}
        controls
        playsInline
        autoPlay={autoPlay}
        muted={autoPlay}
        preload={shouldLoadSource ? 'auto' : 'none'}
        className={playerClass}
        onCanPlay={handleReady}
        onLoadedData={handleReady}
        onError={handleError}
      >
        您的浏览器不支持视频播放
      </video>

      {shouldLoadSource && status === 'loading' && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-white/80" aria-label="视频加载中" />
        </span>
      )}

      {shouldLoadSource && needsManualPlay && status === 'ready' && (
        <button
          type="button"
          onClick={() => void startPlayback(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/10 text-white"
          aria-label="播放视频"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
            <Play className="ml-0.5 h-6 w-6 fill-white" />
          </span>
        </button>
      )}

      {status === 'failed' && (
        <button
          type="button"
          onClick={retry}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-sm font-medium text-white"
        >
          <RefreshCw className="h-5 w-5" />
          重新加载视频
        </button>
      )}
    </div>
  );
}
