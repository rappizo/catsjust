'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Loader2, MessageCircle, Send } from 'lucide-react';
import type { CommentItem } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Avatar } from './Avatar';
import { addComment, toggleCommentLike } from '@/lib/actions/notes';

interface CommentSectionProps {
  noteId: string;
  initialComments: CommentItem[];
  initialCount: number;
  currentUser: { id: string; nickname: string; avatar_url: string | null } | null;
}

/** 楼中楼评论 + 评论点赞 */
export function CommentSection({
  noteId,
  initialComments,
  initialCount,
  currentUser,
}: CommentSectionProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [count, setCount] = useState(initialCount);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const topLevel = comments.filter((c) => !c.parent_id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || submitting) return;
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setSubmitting(true);
    setError('');
    const res = await addComment(noteId, text);
    if (res.ok) {
      const optimistic: CommentItem = {
        id: res.comment.id,
        note_id: noteId,
        user_id: currentUser.id,
        parent_id: null,
        content: text,
        like_count: 0,
        created_at: res.comment.created_at,
        author: {
          id: currentUser.id,
          username: '',
          nickname: currentUser.nickname,
          avatar_url: currentUser.avatar_url,
          bio: null,
          cover_url: null,
          role: 'user',
          status: 'active',
          created_at: res.comment.created_at,
        },
      };
      setComments((prev) => [optimistic, ...prev]);
      setCount((c) => c + 1);
      setContent('');
      router.refresh();
    } else {
      setError(res.error);
    }
    setSubmitting(false);
  }

  async function handleReply(parentId: string, text: string) {
    if (!text.trim() || !currentUser) return;
    const res = await addComment(noteId, text.trim(), parentId);
    if (res.ok) {
      const reply: CommentItem = {
        id: res.comment.id,
        note_id: noteId,
        user_id: currentUser.id,
        parent_id: parentId,
        content: text.trim(),
        like_count: 0,
        created_at: res.comment.created_at,
        author: {
          id: currentUser.id,
          username: '',
          nickname: currentUser.nickname,
          avatar_url: currentUser.avatar_url,
          bio: null,
          cover_url: null,
          role: 'user',
          status: 'active',
          created_at: res.comment.created_at,
        },
      };
      setComments((prev) => [reply, ...prev]);
      setCount((c) => c + 1);
      setReplyingTo(null);
      router.refresh();
    }
  }

  async function handleLike(commentId: string) {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    const res = await toggleCommentLike(commentId);
    if (res.ok) {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, like_count: res.count } : c))
      );
      router.refresh();
    }
  }

  return (
    <section className="mt-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
        <MessageCircle className="h-4 w-4 text-brand-500" />
        {t('feed', 'comments')} {count > 0 && <span className="text-stone-400">({count})</span>}
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="mb-5">
        {!currentUser ? (
          <Link
            href="/login"
            className="block rounded-xl border border-dashed border-stone-300 bg-white px-4 py-3 text-center text-sm text-stone-400 transition hover:border-brand-300 hover:text-brand-500"
          >
            {t('feed', 'loginToComment')}
          </Link>
        ) : (
          <div className="flex items-start gap-3">
            <Avatar src={currentUser.avatar_url} alt={currentUser.nickname} size="md" />
            <div className="flex-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('feed', 'commentPlaceholder')}
                rows={2}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
              <div className="mt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {t('feed', 'submitComment')}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* 评论列表（楼中楼） */}
      {comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-400">{t('feed', 'noComments')}</p>
      ) : (
        <ul className="space-y-4">
          {topLevel.map((comment) => {
            const replies = comments.filter((c) => c.parent_id === comment.id);
            return (
              <li key={comment.id}>
                <CommentRow
                  comment={comment}
                  currentUser={currentUser}
                  isReply={false}
                  onReply={() => setReplyingTo((cur) => (cur === comment.id ? null : comment.id))}
                  onLike={() => handleLike(comment.id)}
                />
                {replyingTo === comment.id && (
                  <ReplyBox
                    currentUser={currentUser}
                    onCancel={() => setReplyingTo(null)}
                    onSubmit={(text) => handleReply(comment.id, text)}
                  />
                )}
                {replies.length > 0 && (
                  <ul className="ml-6 mt-3 space-y-3 border-l-2 border-stone-100 pl-4">
                    {replies.map((reply) => (
                      <li key={reply.id}>
                        <CommentRow
                          comment={reply}
                          currentUser={currentUser}
                          isReply
                          onLike={() => handleLike(reply.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CommentRow({
  comment,
  currentUser,
  isReply,
  onReply,
  onLike,
}: {
  comment: CommentItem;
  currentUser: { id: string; nickname: string; avatar_url: string | null } | null;
  isReply: boolean;
  onReply?: () => void;
  onLike: () => void;
}) {
  const { t } = useI18n();
  const name = comment.author?.nickname || comment.author?.username || '喵友';
  return (
    <div className="flex items-start gap-3">
      <Link href={`/profile/${comment.author?.username ?? ''}`} className="shrink-0">
        <Avatar src={comment.author?.avatar_url} alt={name} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-stone-600">{name}</span>
          <span className="text-[11px] text-stone-300">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-700">
          {comment.content}
        </p>
        <div className="mt-1.5 flex items-center gap-3">
          {!isReply && currentUser && onReply && (
            <button
              onClick={onReply}
              className="text-[11px] text-stone-400 transition hover:text-brand-500"
            >
              {t('feed', 'reply')}
            </button>
          )}
          <button
            onClick={onLike}
            className={cn(
              'flex items-center gap-1 text-[11px] transition',
              (comment.like_count ?? 0) > 0 ? 'text-rose-500' : 'text-stone-400 hover:text-rose-500'
            )}
          >
            <Heart className={cn('h-3 w-3', (comment.like_count ?? 0) > 0 && 'fill-rose-500')} />
            {comment.like_count ?? 0}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReplyBox({
  currentUser,
  onCancel,
  onSubmit,
}: {
  currentUser: { id: string; nickname: string; avatar_url: string | null } | null;
  onCancel: () => void;
  onSubmit: (text: string) => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState('');

  return (
    <div className="ml-6 mt-2 flex items-start gap-2">
      {currentUser && <Avatar src={currentUser.avatar_url} alt={currentUser.nickname} size="sm" />}
      <div className="flex-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('feed', 'replyPlaceholder')}
          rows={2}
          maxLength={500}
          autoFocus
          className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <div className="mt-1.5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full px-3 py-1 text-xs text-stone-400 transition hover:text-stone-600"
          >
            {t('common', 'cancel')}
          </button>
          <button
            onClick={() => {
              onSubmit(text);
              setText('');
            }}
            disabled={!text.trim()}
            className="flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            <Send className="h-3 w-3" />
            {t('feed', 'reply')}
          </button>
        </div>
      </div>
    </div>
  );
}
