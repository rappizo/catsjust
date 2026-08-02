'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Search, Trash2 } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { deleteNotePermanent, reviewNote } from '@/lib/actions/admin';

export interface ContentRow {
  id: string;
  title: string | null;
  content: string | null;
  cover_url: string | null;
  media_type: string;
  status: string;
  reject_reason: string | null;
  like_count: number;
  comment_count: number;
  favorite_count: number;
  created_at: string;
  author: { nickname: string | null; username: string } | null;
}

type FilterKey = 'all' | 'published' | 'removed';

export function ContentManager({ initialNotes }: { initialNotes: ContentRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialNotes.filter((n) => {
      if (filter !== 'all' && n.status !== filter) return false;
      if (!q) return true;
      return (
        (n.title ?? '').toLowerCase().includes(q) ||
        (n.content ?? '').toLowerCase().includes(q) ||
        (n.author?.nickname ?? '').toLowerCase().includes(q) ||
        (n.author?.username ?? '').toLowerCase().includes(q)
      );
    });
  }, [initialNotes, query, filter]);

  async function run(action: string, fn: () => Promise<{ ok: boolean; error?: string }>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(action);
    setError('');
    const res = await fn();
    if (!res.ok) setError(res.error || '操作失败');
    router.refresh();
    setBusyId(null);
  }

  const counts = {
    all: initialNotes.length,
    published: initialNotes.filter((n) => n.status === 'published').length,
    removed: initialNotes.filter((n) => n.status === 'removed').length,
  };

  return (
    <div className="space-y-4">
      {/* 搜索 + 筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题 / 正文 / 作者…"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        {(
          [
            { key: 'all', label: `全部 (${counts.all})` },
            { key: 'published', label: `已发布 (${counts.published})` },
            { key: 'removed', label: `已下架 (${counts.removed})` },
          ] as { key: FilterKey; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
              filter === tab.key ? 'bg-brand-500 text-white' : 'bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{error}</p>}

      {!filtered.length ? (
        <p className="rounded-2xl border border-stone-200/60 bg-white px-5 py-12 text-center text-sm text-stone-400">
          没有匹配的内容
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-card">
          <ul className="divide-y divide-stone-50">
            {filtered.map((n) => (
              <li key={n.id} className="flex items-center gap-4 px-5 py-3.5">
                {n.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.cover_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-2xl">
                    {n.media_type === 'video' ? '🎬' : '🐱'}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/notes/${n.id}`}
                      target="_blank"
                      className="truncate font-medium text-ink hover:text-brand-500"
                    >
                      {n.title || '（无标题）'}
                    </Link>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        n.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'
                      )}
                    >
                      {n.status === 'published' ? '已发布' : '已下架'}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-stone-400">
                    {n.author?.nickname || n.author?.username || '未知'} · {timeAgo(n.created_at)}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    ♥ {n.like_count} · 💬 {n.comment_count} · ⭐ {n.favorite_count}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {n.status === 'published' ? (
                    <button
                      onClick={() =>
                        run(`${n.id}-remove`, () => reviewNote(n.id, 'remove'), '确定下架这篇笔记吗？下架后前台不可见。')
                      }
                      disabled={busyId !== null}
                      className="flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-500 transition hover:bg-stone-50 disabled:opacity-60"
                    >
                      {busyId === `${n.id}-remove` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                      下架
                    </button>
                  ) : (
                    <button
                      onClick={() => run(`${n.id}-approve`, () => reviewNote(n.id, 'approve'))}
                      disabled={busyId !== null}
                      className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {busyId === `${n.id}-approve` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                      重新上架
                    </button>
                  )}
                  <button
                    onClick={() =>
                      run(
                        `${n.id}-delete`,
                        () => deleteNotePermanent(n.id),
                        `确定永久删除《${n.title || '无标题'}》吗？删除后不可恢复，其点赞/收藏/评论一并删除。`
                      )
                    }
                    disabled={busyId !== null}
                    className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    {busyId === `${n.id}-delete` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
