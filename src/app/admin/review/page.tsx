import { createClient } from '@/lib/supabase/server';
import { ReviewActions, ProcessedBadge } from '@/components/admin/ReviewActions';
import { timeAgo } from '@/lib/utils';
import type { Note } from '@/lib/types';

export const metadata = {
  title: '内容审核',
};

export default async function AdminReviewPage() {
  const supabase = createClient();

  const { data: pendingNotes } = await supabase
    .from('notes')
    .select('*, author:profiles(nickname, username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: processedNotes } = await supabase
    .from('notes')
    .select('*, author:profiles(nickname, username)')
    .in('status', ['published', 'rejected', 'removed'])
    .order('updated_at', { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">内容审核</h1>
        <p className="mt-0.5 text-sm text-stone-400">先审后发：新内容默认待审核，通过后公开展示</p>
      </div>

      {/* 待审队列 */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
          待审核
          {pendingNotes && pendingNotes.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600">
              {pendingNotes.length}
            </span>
          )}
        </h2>
        {!pendingNotes?.length ? (
          <p className="rounded-2xl border border-stone-200/60 bg-white px-5 py-12 text-center text-sm text-stone-400">
            暂无待审核内容 🎉
          </p>
        ) : (
          <ul className="space-y-3">
            {pendingNotes.map((note) => {
              const typed = note as Note;
              const author = Array.isArray(note.author) ? note.author[0] : note.author;
              return (
                <li key={note.id} className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-card">
                  <div className="flex items-start gap-4">
                    {typed.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={typed.cover_url}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-3xl">
                        {typed.media_type === 'video' ? '🎬' : '🐱'}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{typed.title || '（无标题）'}</p>
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">
                          {typed.media_type === 'video' ? '视频' : '图文'}
                        </span>
                      </div>
                      {typed.content && (
                        <p className="mt-1 line-clamp-2 text-sm text-stone-500">{typed.content}</p>
                      )}
                      <p className="mt-2 text-xs text-stone-400">
                        @{author?.nickname || author?.username} · 提交于 {timeAgo(typed.created_at)}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <ReviewActions note={typed} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 已处理 */}
      <section>
        <h2 className="mb-3 font-semibold text-ink">最近处理</h2>
        {!processedNotes?.length ? (
          <p className="rounded-2xl border border-stone-200/60 bg-white px-5 py-12 text-center text-sm text-stone-400">
            还没有处理记录
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200/60 bg-white shadow-card">
            {processedNotes.map((note) => {
              const typed = note as Note;
              const author = Array.isArray(note.author) ? note.author[0] : note.author;
              return (
                <li key={note.id} className="flex items-center gap-3 px-4 py-3">
                  {typed.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={typed.cover_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100">
                      {typed.media_type === 'video' ? '🎬' : '🐱'}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{typed.title || '（无标题）'}</p>
                    <p className="truncate text-xs text-stone-400">
                      @{author?.nickname || author?.username} · {timeAgo(typed.updated_at)}
                      {typed.status === 'rejected' && typed.reject_reason && ` · 原因：${typed.reject_reason}`}
                    </p>
                  </div>
                  <ProcessedBadge status={typed.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
