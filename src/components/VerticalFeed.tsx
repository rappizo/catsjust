'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bookmark,
  Check,
  Heart,
  Loader2,
  MessageCircle,
  Share2,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toggleFavorite, toggleLike } from '@/lib/actions/notes';
import { cn, formatCount, timeAgo } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Avatar } from './Avatar';
import { VideoPlayer } from './VideoPlayer';
import { CommentSection } from './CommentSection';
import { ReportDialog } from './ReportDialog';
import { thumbUrl } from '@/lib/img';
import type { CommentItem, Note } from '@/lib/types';

interface VerticalFeedProps {
  notes: Note[];
  initialIndex: number;
  likedMap: Record<string, boolean>;
  favoritedMap: Record<string, boolean>;
  loggedIn: boolean;
  currentUser: { id: string; nickname: string; avatar_url: string | null } | null;
}

/** ===== 点赞/收藏/分享 交互逻辑（统一按钮与双击） ===== */
function useFeedInteractions(
  note: Note,
  loggedIn: boolean,
  initialLiked: boolean,
  initialFavorited: boolean
) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [favorited, setFavorited] = useState(initialFavorited);
  const [counts, setCounts] = useState({ like: note.like_count, favorite: note.favorite_count });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function like() {
    if (busy) return;
    setBusy(true);
    const prev = { liked, count: counts.like };
    setLiked((v) => !v);
    setCounts((c) => ({ ...c, like: c.like + (liked ? -1 : 1) }));
    const res = await toggleLike(note.id);
    if (!res.ok || res.liked !== !liked) {
      setLiked(prev.liked);
      setCounts((c) => ({ ...c, like: prev.count }));
    } else {
      setCounts((c) => ({ ...c, like: res.count }));
    }
    setBusy(false);
    router.refresh();
  }

  async function favorite() {
    if (busy) return;
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    const prev = { favorited, count: counts.favorite };
    setFavorited((v) => !v);
    setCounts((c) => ({ ...c, favorite: c.favorite + (favorited ? -1 : 1) }));
    const res = await toggleFavorite(note.id);
    if (!res.ok || res.favorited !== !favorited) {
      setFavorited(prev.favorited);
      setCounts((c) => ({ ...c, favorite: prev.count }));
    } else {
      setCounts((c) => ({ ...c, favorite: res.count }));
    }
    setBusy(false);
    router.refresh();
  }

  async function share() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 忽略剪贴板失败
    }
  }

  return { liked, favorited, counts, busy, copied, like, favorite, share };
}

/** ===== 媒体区：图片单击左右翻页，双击点赞；视频直接播放 ===== */
function FeedMedia({
  note,
  liked,
  onDoubleTapLike,
  active,
}: {
  note: Note;
  liked: boolean;
  onDoubleTapLike: () => void;
  /** 是否为当前可见（自动播放）的视频 */
  active: boolean;
}) {
  const images = (note.media ?? []).filter((m) => m.type === 'image');
  const [imgIndex, setImgIndex] = useState(0);
  const [heartFx, setHeartFx] = useState(false);
  const lastTap = useRef(0);

  if (note.media_type === 'video') {
    return (
      <VideoPlayer src={note.media?.[0]?.url ?? ''} poster={note.media?.[0]?.poster} fill autoPlay={active} />
    );
  }
  if (images.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500/20 to-accent-500/20 text-6xl">
        🐱
      </div>
    );
  }

  function handleTap(e: React.PointerEvent<HTMLDivElement>) {
    const now = Date.now();
    const isDouble = now - lastTap.current < 300;
    lastTap.current = now;

    if (isDouble) {
      // 双击：点赞（RED 行为，双击只加赞不取消）
      if (!liked) {
        setHeartFx(true);
        setTimeout(() => setHeartFx(false), 700);
        onDoubleTapLike();
      }
      return;
    }

    // 单击左右区域切换图片
    if (images.length > 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < rect.width / 3) {
        setImgIndex((i) => (i - 1 + images.length) % images.length);
      } else if (x > (rect.width * 2) / 3) {
        setImgIndex((i) => (i + 1) % images.length);
      }
    }
  }

  const current = images[imgIndex];

  return (
    <div
      className="relative flex h-full w-full select-none items-center justify-center"
      onPointerUp={handleTap}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbUrl(current.url, 1080)}
        alt={note.title || '猫咪图片'}
        className="h-full w-full object-cover"
        draggable={false}
      />
      {images.length > 1 && (
        <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {imgIndex + 1} / {images.length}
        </span>
      )}
      {heartFx && (
        <span className="animate-heart-pop pointer-events-none absolute text-8xl text-rose-500 drop-shadow-[0_0_24px_rgba(244,63,94,0.9)]">
          ❤️
        </span>
      )}
    </div>
  );
}

/** ===== 右侧竖向操作栏 ===== */
function FeedActions({
  liked,
  favorited,
  likeCount,
  favoriteCount,
  commentCount,
  copied,
  busy,
  onLike,
  onFavorite,
  onComment,
  onShare,
}: {
  liked: boolean;
  favorited: boolean;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  copied: boolean;
  busy: boolean;
  onLike: () => void;
  onFavorite: () => void;
  onComment: () => void;
  onShare: () => void;
}) {
  const { t } = useI18n();
  const item =
    'flex flex-col items-center gap-1 text-white/90 transition hover:scale-110 hover:text-white';

  return (
    <div className="flex flex-col items-center gap-5">
      <button onClick={onLike} disabled={busy} className={cn(item, liked && 'text-rose-500')} aria-label={t('feed', 'like')}>
        <Heart className={cn('h-7 w-7 transition-transform', liked && 'scale-110 fill-rose-500')} />
        <span className="text-xs">{formatCount(likeCount)}</span>
      </button>
      <button onClick={onFavorite} className={cn(item, favorited && 'text-brand-500')} aria-label={t('feed', 'favorite')}>
        <Bookmark className={cn('h-7 w-7', favorited && 'fill-brand-500')} />
        <span className="text-xs">{formatCount(favoriteCount)}</span>
      </button>
      <button onClick={onComment} className={item} aria-label={t('feed', 'comments')}>
        <MessageCircle className="h-7 w-7" />
        <span className="text-xs">{formatCount(commentCount)}</span>
      </button>
      <button onClick={onShare} className={cn(item, copied && 'text-emerald-400')} aria-label={t('feed', 'share')}>
        {copied ? <Check className="h-7 w-7" /> : <Share2 className="h-7 w-7" />}
        <span className="text-xs">{copied ? t('feed', 'copied') : t('feed', 'share')}</span>
      </button>
    </div>
  );
}

/** ===== 单个信息流条目（全屏） ===== */
function FeedItem({
  note,
  initialLiked,
  initialFavorited,
  loggedIn,
  active,
  onOpenComments,
}: {
  note: Note;
  initialLiked: boolean;
  initialFavorited: boolean;
  loggedIn: boolean;
  /** 是否为当前可见（视频自动播放）的条目 */
  active: boolean;
  onOpenComments: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { liked, favorited, counts, busy, copied, like, favorite, share } = useFeedInteractions(
    note,
    loggedIn,
    initialLiked,
    initialFavorited
  );
  const authorName = note.author?.nickname || note.author?.username || t('note', 'authorFallback');
  const profileHref = note.author ? `/profile/${note.author.username}` : '#';

  return (
    <section className="relative h-screen snap-start overflow-hidden bg-black">
      {/* 顶部栏 */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-4 pb-12 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button
          onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
          aria-label={t('common', 'back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Link href={profileHref} className="flex min-w-0 items-center gap-2.5">
          <Avatar src={note.author?.avatar_url} alt={authorName} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{authorName}</p>
            <p className="text-[11px] text-white/60">{timeAgo(note.created_at)}</p>
          </div>
        </Link>
        {note.cat && (
          <span className="ml-auto shrink-0 rounded-full bg-brand-500/20 px-2.5 py-1 text-[11px] font-medium text-brand-400 backdrop-blur-sm">
            🐾 {note.cat.name}
          </span>
        )}
      </div>

      {/* 媒体 */}
      <div className="absolute inset-0 z-10">
        <FeedMedia note={note} liked={liked} onDoubleTapLike={like} active={active} />
      </div>

      {/* 底部信息 */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-5 pb-8 pt-28">
        <div className="pr-20">
          {note.title && <h2 className="text-base font-semibold text-white">{note.title}</h2>}
          {note.content && (
            <p className="no-scrollbar mt-1.5 max-h-44 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-white/90">
              {note.content}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
            {note.topic && (
              <Link
                href={`/topics/${note.topic.slug}`}
                className="rounded-full bg-white/10 px-2.5 py-1 text-white/80 backdrop-blur-sm transition hover:bg-white/20"
              >
                # {note.topic.name}
              </Link>
            )}
            {note.cat?.breed && (
              <Link
                href={`/topics/breeds/${encodeURIComponent(note.cat.breed)}`}
                className="rounded-full bg-white/10 px-2.5 py-1 text-accent-300 backdrop-blur-sm transition hover:bg-white/20"
              >
                # {note.cat.breed}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 右侧操作栏 */}
      <div className="absolute bottom-16 right-2 z-20">
        <div className="flex flex-col items-center gap-5">
          <FeedActions
            liked={liked}
            favorited={favorited}
            likeCount={counts.like}
            favoriteCount={counts.favorite}
            commentCount={note.comment_count}
            copied={copied}
            busy={busy}
            onLike={like}
            onFavorite={favorite}
            onComment={onOpenComments}
            onShare={share}
          />
          <ReportDialog
            noteId={note.id}
            targetUserId={note.author_id}
            variant="dark"
            label="举报"
          />
        </div>
      </div>
    </section>
  );
}

/** ===== 评论抽屉 ===== */
function CommentSheet({
  noteId,
  currentUser,
  initialCount,
  onClose,
}: {
  noteId: string;
  currentUser: { id: string; nickname: string; avatar_url: string | null } | null;
  initialCount: number;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await createClient()
          .from('comments')
          .select('*, author:profiles(*)')
          .eq('note_id', noteId)
          .order('created_at', { ascending: false })
          .limit(100);
        if (!cancelled) {
          setComments((data ?? []) as CommentItem[]);
        }
      } catch {
        // 忽略加载失败
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="关闭评论" />
      <div className="animate-fade-in-up relative max-h-[75vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-ink">{t('feed', 'commentTitle')}</h3>
          <button onClick={onClose} className="text-stone-400 transition hover:text-stone-600" aria-label={t('common', 'close')}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-stone-400">
              <Loader2 className="h-4 w-4 animate-spin" /> {t('feed', 'loadingComments')}
            </div>
          ) : (
            <CommentSection
              noteId={noteId}
              initialComments={comments ?? []}
              initialCount={initialCount}
              currentUser={currentUser}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** ===== 小红书式全屏上下滑信息流 ===== */
export function VerticalFeed({
  notes,
  initialIndex,
  likedMap,
  favoritedMap,
  loggedIn,
  currentUser,
}: VerticalFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initialIndex);
  const [commentFor, setCommentFor] = useState<string | null>(null);

  // 初始定位到当前笔记
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = initialIndex * el.clientHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndex]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx !== index && idx >= 0 && idx < notes.length) {
      setIndex(idx);
      // 同步 URL（不触发导航，便于分享/刷新）
      window.history.replaceState(null, '', `/notes/${notes[idx].id}`);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black">
      {/* 全屏上下滑容器 */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
      >
        {notes.map((note, i) => (
          <FeedItem
            key={note.id}
            note={note}
            initialLiked={likedMap[note.id] ?? false}
            initialFavorited={favoritedMap[note.id] ?? false}
            loggedIn={loggedIn}
            active={i === index}
            onOpenComments={() => setCommentFor(note.id)}
          />
        ))}
      </div>

      {/* 评论抽屉 */}
      {commentFor && (
        <CommentSheet
          noteId={commentFor}
          currentUser={currentUser}
          initialCount={notes.find((n) => n.id === commentFor)?.comment_count ?? 0}
          onClose={() => setCommentFor(null)}
        />
      )}
    </div>
  );
}
