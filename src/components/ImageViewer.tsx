'use client';

import { ArrowLeft } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { thumbUrl } from '@/lib/img';

interface ImageViewerProps {
  images: string[];
  index: number;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
  title?: string | null;
  originRect?: ImageRect | null;
}

type ImageRect = { x: number; y: number; width: number; height: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function getFlipTransform(origin: ImageRect, destination: ImageRect) {
  const scale = clamp(
    Math.min(origin.width / destination.width, origin.height / destination.height),
    0.05,
    1
  );

  return {
    scale,
    x: origin.x + origin.width / 2 - (destination.x + destination.width / 2),
    y: origin.y + origin.height / 2 - (destination.y + destination.height / 2),
  };
}

export function ImageViewer({ images, index, onChangeIndex, onClose, title, originRect }: ImageViewerProps) {
  const count = images.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const curImgRef = useRef<HTMLImageElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const restRectRef = useRef<ImageRect | null>(null);
  const historyEntryRef = useRef(false);
  const closingRef = useRef(false);
  const initializedIndexRef = useRef(index);
  const [curSrc, setCurSrc] = useState(() => thumbUrl(images[index] ?? '', 1200));

  const indexRef = useRef(index);
  indexRef.current = index;

  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const gestureRef = useRef({
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
    finalDx: 0,
    lastTapT: 0,
    animating: false,
  });

  function setTrack(offset: number, animate = false) {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animate ? 'transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none';
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
  }

  function applyCurrentTransform(scale: number, x: number, y: number, animate = false) {
    const image = curImgRef.current;
    if (!image) return;
    image.style.transition = animate ? 'transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none';
    image.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }

  function loadHiRes(imageIndex: number) {
    const source = images[imageIndex];
    if (!source) return;
    const highResolution = new Image();
    highResolution.src = thumbUrl(source, 1920);
    highResolution.onload = () => {
      if (indexRef.current === imageIndex) setCurSrc(thumbUrl(source, 1920));
    };
  }

  function close(fromHistory = false) {
    if (closingRef.current) return;
    closingRef.current = true;

    const image = curImgRef.current;
    const backdrop = backdropRef.current;
    const destination = restRectRef.current;
    const flip = image && destination && originRect ? getFlipTransform(originRect, destination) : null;

    if (backdrop) {
      backdrop.style.transition = 'opacity 0.24s ease';
      backdrop.style.opacity = '0';
    }

    if (image && flip) {
      image.style.transition = 'transform 0.28s cubic-bezier(0.55, 0, 0.55, 0.2)';
      image.style.transform = `translate3d(${flip.x}px, ${flip.y}px, 0) scale(${flip.scale})`;
    } else if (image) {
      image.style.transition = 'opacity 0.2s ease';
      image.style.opacity = '0';
    }

    window.setTimeout(() => {
      if (!fromHistory && historyEntryRef.current) {
        historyEntryRef.current = false;
        window.history.back();
      }
      onClose();
    }, flip ? 300 : 220);
  }

  function goNext() {
    const gesture = gestureRef.current;
    const container = containerRef.current;
    if (!container || count < 2 || gesture.animating) return;
    gesture.animating = true;
    setTrack(-2 * container.clientWidth, true);
    window.setTimeout(() => onChangeIndex((indexRef.current + 1) % count), 330);
  }

  function goPrevious() {
    const gesture = gestureRef.current;
    const container = containerRef.current;
    if (!container || count < 2 || gesture.animating) return;
    gesture.animating = true;
    setTrack(0, true);
    window.setTimeout(() => onChangeIndex((indexRef.current - 1 + count) % count), 330);
  }

  function bounceCurrentImage() {
    const container = containerRef.current;
    if (!container) return;
    const scale = scaleRef.current;
    const maxX = ((scale - 1) * container.clientWidth) / 2;
    const maxY = ((scale - 1) * container.clientHeight) / 2;
    txRef.current = clamp(txRef.current, -maxX, maxX);
    tyRef.current = clamp(tyRef.current, -maxY, maxY);
    applyCurrentTransform(scale, txRef.current, tyRef.current, true);
  }

  // This has to run before measuring the expanded image. Percentage translation
  // refers to the track instead of a slide and is what caused the split image.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container) setTrack(-container.clientWidth, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const image = curImgRef.current;
    const backdrop = backdropRef.current;
    if (!image) return;

    // Reset first so React Strict Mode's development effect replay measures the
    // untransformed, full-screen image instead of the previous FLIP frame.
    image.style.transition = 'none';
    image.style.transform = 'translate3d(0, 0, 0) scale(1)';
    const destination = image.getBoundingClientRect();
    restRectRef.current = {
      x: destination.x,
      y: destination.y,
      width: destination.width,
      height: destination.height,
    };
    const flip = originRect ? getFlipTransform(originRect, restRectRef.current) : null;

    image.style.transform = flip
      ? `translate3d(${flip.x}px, ${flip.y}px, 0) scale(${flip.scale})`
      : 'translate3d(0, 0, 0) scale(0.96)';
    image.style.opacity = '1';

    if (backdrop) {
      backdrop.style.transition = 'none';
      backdrop.style.opacity = '0';
    }

    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (backdrop) {
          backdrop.style.transition = 'opacity 0.28s ease';
          backdrop.style.opacity = '1';
        }
        image.style.transition = 'transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1)';
        image.style.transform = 'translate3d(0, 0, 0) scale(1)';
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [originRect]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setTrack(-container.clientWidth, false));
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadHiRes(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // A same-URL history entry lets the device/browser back action close the
  // viewer with the same shrink animation instead of leaving the detail page.
  useEffect(() => {
    const marker = '__catsjust_image_viewer__';
    window.history.pushState({ ...(window.history.state ?? {}), [marker]: true }, '', window.location.href);
    historyEntryRef.current = true;

    const handlePopState = () => {
      if (!closingRef.current && historyEntryRef.current) {
        historyEntryRef.current = false;
        close(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container) setTrack(-container.clientWidth, false);

    if (initializedIndexRef.current === index) return;
    initializedIndexRef.current = index;
    gestureRef.current.animating = false;
    scaleRef.current = 1;
    txRef.current = 0;
    tyRef.current = 0;
    setCurSrc(thumbUrl(images[index] ?? '', 1200));
    loadHiRes(index);
    applyCurrentTransform(1, 0, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const viewer = container;
    const gesture = gestureRef.current;

    function onTouchStart(event: TouchEvent) {
      const touches = event.touches;
      gesture.moved = false;
      if (touches.length === 1) {
        const touch = touches[0];
        gesture.mode = 'pan';
        gesture.startX = touch.clientX;
        gesture.startY = touch.clientY;
        gesture.startTx = txRef.current;
        gesture.startTy = tyRef.current;
        gesture.lastX = touch.clientX;
        gesture.lastY = touch.clientY;
        gesture.lastT = Date.now();
        gesture.velX = 0;
      } else if (touches.length === 2) {
        gesture.mode = 'pinch';
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        gesture.startDist = Math.hypot(dx, dy) || 1;
        gesture.startScale = scaleRef.current;
      }
    }

    function onTouchMove(event: TouchEvent) {
      const touches = event.touches;
      if (touches.length === 2 && gesture.mode === 'pinch') {
        event.preventDefault();
        gesture.moved = true;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        const distance = Math.hypot(dx, dy) || 1;
        const scale = clamp((gesture.startScale * distance) / gesture.startDist, 1, 4);
        scaleRef.current = scale;
        applyCurrentTransform(scale, txRef.current, tyRef.current);
        return;
      }

      if (touches.length !== 1 || gesture.mode !== 'pan') return;
      const touch = touches[0];
      const dx = touch.clientX - gesture.startX;
      const dy = touch.clientY - gesture.startY;
      const now = Date.now();
      const elapsed = now - gesture.lastT;
      if (elapsed > 0) gesture.velX = (touch.clientX - gesture.lastX) / elapsed;
      gesture.lastX = touch.clientX;
      gesture.lastY = touch.clientY;
      gesture.lastT = now;
      gesture.finalDx = dx;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) gesture.moved = true;

      event.preventDefault();
      if (scaleRef.current > 1.02) {
        const maxX = ((scaleRef.current - 1) * viewer.clientWidth) / 2;
        const maxY = ((scaleRef.current - 1) * viewer.clientHeight) / 2;
        txRef.current = clamp(gesture.startTx + dx, -maxX, maxX);
        tyRef.current = clamp(gesture.startTy + dy, -maxY, maxY);
        applyCurrentTransform(scaleRef.current, txRef.current, tyRef.current);
      } else {
        setTrack(-viewer.clientWidth + dx);
      }
    }

    function onTouchEnd() {
      if (gesture.mode === 'pinch') {
        if (scaleRef.current > 1.02) bounceCurrentImage();
        gesture.mode = 'none';
        return;
      }

      if (gesture.mode === 'pan') {
        if (scaleRef.current > 1.02) {
          bounceCurrentImage();
        } else {
          const width = viewer.clientWidth;
          const flick = Math.abs(gesture.velX) > 0.55;
          if (gesture.moved && (gesture.finalDx < -width * 0.25 || (gesture.finalDx < -40 && flick))) {
            goNext();
          } else if (gesture.moved && (gesture.finalDx > width * 0.25 || (gesture.finalDx > 40 && flick))) {
            if (indexRef.current === 0) close();
            else goPrevious();
          } else {
            setTrack(-width, true);
          }
        }
        gesture.mode = 'none';
      }

      const now = Date.now();
      if (!gesture.moved && now - gesture.lastTapT < 260) {
        const nextScale = scaleRef.current > 1.2 ? 1 : 2.5;
        scaleRef.current = nextScale;
        if (nextScale === 1) {
          txRef.current = 0;
          tyRef.current = 0;
        }
        applyCurrentTransform(nextScale, txRef.current, tyRef.current, true);
        gesture.lastTapT = 0;
      } else if (!gesture.moved) {
        gesture.lastTapT = now;
      }
    }

    function onContextMenu(event: MouseEvent) {
      if ((event.target as Element).closest('[data-image-viewer-control]')) return;
      event.preventDefault();
      close();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' || (event.altKey && event.key === 'ArrowLeft')) {
        event.preventDefault();
        close();
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });
    container.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      container.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (count === 0) return null;

  const getImage = (imageIndex: number) => images[((imageIndex % count) + count) % count];
  const shown = [getImage(index - 1), getImage(index), getImage(index + 1)];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[70] overflow-hidden"
      style={{ touchAction: 'none' }}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? '图片查看'}
    >
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="absolute inset-0 bg-black/95"
        style={{ opacity: 0, willChange: 'opacity' }}
      />

      <div
        ref={trackRef}
        className="relative flex h-full w-full"
        style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}
      >
        {shown.map((image, imagePosition) => (
          <div
            key={`${index}-${imagePosition}`}
            className="flex h-full shrink-0 items-center justify-center"
            style={{ flexBasis: '100%' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imagePosition === 1 ? curImgRef : null}
              src={imagePosition === 1 ? curSrc : thumbUrl(image, 1200)}
              alt={`${title ?? '图片'} ${((index + imagePosition - 1 + count) % count) + 1}`}
              draggable={false}
              className="block max-h-full max-w-full select-none object-contain"
              style={imagePosition === 1 ? { willChange: 'transform' } : undefined}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        data-image-viewer-control
        onClick={() => close()}
        className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/65"
        aria-label="返回"
        title="返回"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {count > 1 && (
        <>
          <span className="pointer-events-none absolute right-4 top-4 z-10 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
            {index + 1} / {count}
          </span>
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-1.5">
            {images.map((_, imageIndex) => (
              <span
                key={imageIndex}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  imageIndex === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
