'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import type { CommentItem } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';
import { Avatar } from './Avatar';
import { addComment } from '@/lib/actions/notes';

interface CommentSectionProps {
  noteId: string;
  initialComments: CommentItem[];
  initialCount: number;
  currentUser: { id: string; nickname: string; avatar_url: string | null } | null;
}

export function CommentSection({
  noteId,
  initialComments,
  initialCount,
  currentUser,
}: CommentSectionProps) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [count, setCount] = useState(initialCount);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <section className="mt-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
        <MessageCircle className="h-4 w-4 text-brand-500" />
        评论 {count > 0 && <span className="text-stone-400">({count})</span>}
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="mb-5">
        {!currentUser ? (
          <Link
            href="/login"
            className="block rounded-xl border border-dashed border-stone-300 bg-white px-4 py-3 text-center text-sm text-stone-400 transition hover:border-brand-300 hover:text-brand-500"
          >
            登录后参与评论
          </Link>
        ) : (
          <div className="flex items-start gap-3">
            <Avatar src={currentUser.avatar_url} alt={currentUser.nickname} size="md" />
            <div className="flex-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="友善地夸一夸这只猫吧～"
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
                  发表评论
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* 评论列表 */}
      {comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-400">还没有评论，快来抢沙发～</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="flex items-start gap-3">
              <Link href={`/profile/${comment.author?.username ?? ''}`} className="shrink-0">
                <Avatar src={comment.author?.avatar_url} alt={comment.author?.nickname || '用户'} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={cn('text-xs font-semibold text-stone-600')}>
                    {comment.author?.nickname || '喵友'}
                  </span>
                  <span className="text-[11px] text-stone-300">{timeAgo(comment.created_at)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-700">
                  {comment.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
