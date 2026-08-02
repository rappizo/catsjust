'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Bookmark, Check, Heart, MessageCircle, Share2 } from 'lucide-react';
import { cn, formatCount } from '@/lib/utils';
import { toggleFavorite, toggleLike } from '@/lib/actions/notes';

interface NoteActionsProps {
  noteId: string;
  initialLiked: boolean;
  initialFavorited: boolean;
  likeCount: number;
  favoriteCount: number;
  commentCount?: number;
  /** 是否已登录（收藏需要登录，点赞游客也可用） */
  loggedIn?: boolean;
  /** 是否显示为详情页大按钮样式 */
  large?: boolean;
}

/** 点赞 / 收藏 / 分享 操作栏 */
export function NoteActions({
  noteId,
  initialLiked,
  initialFavorited,
  likeCount,
  favoriteCount,
  commentCount,
  loggedIn = false,
  large = false,
}: NoteActionsProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [favorited, setFavorited] = useState(initialFavorited);
  const [counts, setCounts] = useState({ like: likeCount, favorite: favoriteCount });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleLike() {
    if (busy) return;
    setBusy(true);
    // 乐观更新
    const prev = { liked, count: counts.like };
    setLiked((v) => !v);
    setCounts((c) => ({ ...c, like: c.like + (liked ? -1 : 1) }));
    const res = await toggleLike(noteId);
    if (!res.ok || res.liked !== !liked) {
      setLiked(prev.liked);
      setCounts((c) => ({ ...c, like: prev.count }));
    } else {
      setCounts((c) => ({ ...c, like: res.count }));
    }
    setBusy(false);
    router.refresh();
  }

  async function handleFavorite() {
    if (busy) return;
    if (!loggedIn) {
      // 收藏属于个人收藏夹，需要登录
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    const prev = { favorited, count: counts.favorite };
    setFavorited((v) => !v);
    setCounts((c) => ({ ...c, favorite: c.favorite + (favorited ? -1 : 1) }));
    const res = await toggleFavorite(noteId);
    if (!res.ok || res.favorited !== !favorited) {
      setFavorited(prev.favorited);
      setCounts((c) => ({ ...c, favorite: prev.count }));
    } else {
      setCounts((c) => ({ ...c, favorite: res.count }));
    }
    setBusy(false);
    router.refresh();
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 忽略剪贴板失败
    }
  }

  const btnBase = large
    ? 'flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-4 text-xs font-medium transition'
    : 'flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition';

  return (
    <div className={cn('flex items-center', large && 'gap-2')}>
      <button
        onClick={handleLike}
        disabled={busy}
        className={cn(btnBase, liked ? 'text-rose-500' : 'text-stone-500 hover:bg-rose-50')}
      >
        <Heart
          className={cn('h-6 w-6 transition-transform', liked && 'scale-110 fill-rose-500')}
        />
        {formatCount(counts.like)}
      </button>

      <button
        onClick={handleFavorite}
        disabled={busy}
        className={cn(btnBase, favorited ? 'text-brand-500' : 'text-stone-500 hover:bg-brand-50')}
      >
        <Bookmark className={cn('h-6 w-6', favorited && 'fill-brand-500')} />
        {formatCount(counts.favorite)}
      </button>

      {typeof commentCount === 'number' && (
        <span className={cn(btnBase, 'text-stone-500')}>
          <MessageCircle className="h-6 w-6" />
          {commentCount}
        </span>
      )}

      <button
        onClick={handleShare}
        className={cn(btnBase, copied ? 'text-emerald-500' : 'text-stone-500 hover:bg-stone-100')}
      >
        {copied ? <Check className="h-6 w-6" /> : <Share2 className="h-6 w-6" />}
        {copied ? '已复制' : '分享'}
      </button>
    </div>
  );
}
