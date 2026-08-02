'use client';

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
}

/** 视频播放器（原生控件） */
export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-stone-950">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={src}
        poster={poster ?? undefined}
        controls
        playsInline
        preload="metadata"
        className="max-h-[70vh] w-full"
      >
        您的浏览器不支持视频播放
      </video>
    </div>
  );
}
