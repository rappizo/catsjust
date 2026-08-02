'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ban, Check, Flag, Loader2, Trash2, X } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import {
  banReportedUser,
  deleteReportedComment,
  deleteReportedNote,
  setReportStatus,
} from '@/lib/actions/admin';

export interface ReportRow {
  id: string;
  reporter_id: string;
  note_id: string | null;
  comment_id: string | null;
  target_user_id: string | null;
  reason: string;
  detail: string | null;
  status: 'open' | 'processing' | 'resolved' | 'rejected';
  resolution: string | null;
  handled_at: string | null;
  created_at: string;
  reporter: { id: string; username: string; nickname: string | null; avatar_url: string | null } | null;
  target_user: { id: string; username: string; nickname: string | null; status: string } | null;
  note?: {
    id: string;
    title: string | null;
    cover_url: string | null;
    media_type: string;
    status: string;
    author_id: string;
    author: { id: string; username: string; nickname: string | null } | null;
  } | null;
  comment?: {
    id: string;
    content: string;
    user_id: string;
    author: { id: string; username: string; nickname: string | null } | null;
  } | null;
}

const STATUS_LABEL: Record<string, string> = {
  open: '待处理',
  processing: '处理中',
  resolved: '已处理',
  rejected: '已驳回',
};

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-amber-50 text-amber-600',
  processing: 'bg-blue-50 text-blue-600',
  resolved: 'bg-emerald-50 text-emerald-600',
  rejected: 'bg-stone-100 text-stone-400',
};

type FilterKey = 'all' | 'pending' | 'resolved' | 'rejected';

export function ReportsView({ initialReports }: { initialReports: ReportRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    if (filter === 'all') return initialReports;
    if (filter === 'pending') return initialReports.filter((r) => r.status === 'open' || r.status === 'processing');
    return initialReports.filter((r) => r.status === filter);
  }, [initialReports, filter]);

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
    all: initialReports.length,
    pending: initialReports.filter((r) => r.status === 'open' || r.status === 'processing').length,
    resolved: initialReports.filter((r) => r.status === 'resolved').length,
    rejected: initialReports.filter((r) => r.status === 'rejected').length,
  };

  const tabs: { key: FilterKey; label: string }[] = [
    { key: 'pending', label: `待处理 (${counts.pending})` },
    { key: 'resolved', label: `已处理 (${counts.resolved})` },
    { key: 'rejected', label: `已驳回 (${counts.rejected})` },
    { key: 'all', label: `全部 (${counts.all})` },
  ];

  return (
    <div className="space-y-4">
      {/* 状态筛选 */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
              filter === tab.key ? 'bg-brand-500 text-[#04281a]' : 'bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{error}</p>}

      {!filtered.length ? (
        <p className="rounded-2xl border border-stone-200/60 bg-white px-5 py-12 text-center text-sm text-stone-400">
          暂无举报工单 🎉
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => {
            const isOpen = r.status === 'open' || r.status === 'processing';
            return (
              <li key={r.id} className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-card">
                <div className="flex flex-wrap items-start gap-4">
                  {/* 举报对象缩略图/图标 */}
                  <div className="shrink-0">
                    {r.note?.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.note.cover_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-red-50 text-2xl">
                        {r.note ? (r.note.media_type === 'video' ? '🎬' : '🐱') : r.comment ? '💬' : '👤'}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* 头部：状态 + 举报原因 + 时间 */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium', STATUS_COLOR[r.status])}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      <p className="font-semibold text-ink">{r.reason}</p>
                      <span className="text-xs text-stone-300">· {timeAgo(r.created_at)}</span>
                    </div>

                    {/* 举报内容预览 */}
                    {r.note && (
                      <Link
                        href={`/notes/${r.note.id}`}
                        target="_blank"
                        className="mt-1.5 block truncate text-sm text-stone-500 hover:text-brand-500"
                      >
                        被举报笔记：{r.note.title || '（无标题）'}
                        <span className="ml-1 text-xs text-stone-300">
                          by {r.note.author?.nickname || r.note.author?.username || '未知'}
                        </span>
                      </Link>
                    )}
                    {r.comment && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-stone-500">
                        被举报评论：{r.comment.content}
                        <span className="ml-1 text-xs text-stone-300">
                          by {r.comment.author?.nickname || r.comment.author?.username || '未知'}
                        </span>
                      </p>
                    )}
                    {r.target_user && (
                      <p className="mt-1.5 text-sm text-stone-500">
                        被举报用户：{r.target_user.nickname || r.target_user.username}
                        {r.target_user.status === 'banned' && (
                          <span className="ml-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-500">已封禁</span>
                        )}
                      </p>
                    )}

                    {/* 举报详情 + 举报人 */}
                    {r.detail && <p className="mt-1 text-xs text-stone-400">详情：{r.detail}</p>}
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-400">
                      <Avatar src={r.reporter?.avatar_url} alt={r.reporter?.nickname || '举报人'} size="sm" />
                      <span>
                        举报人：{r.reporter?.nickname || r.reporter?.username || '未知'}
                      </span>
                      {r.handled_at && <span>· 处理于 {timeAgo(r.handled_at)}</span>}
                    </div>

                    {r.resolution && (
                      <p className="mt-1 rounded-lg bg-stone-50 px-2.5 py-1 text-xs text-stone-500">
                        处理说明：{r.resolution}
                      </p>
                    )}
                  </div>

                  {/* 操作区 */}
                  {isOpen && (
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {r.note && (
                        <button
                          onClick={() =>
                            run(
                              `${r.id}-delete-note`,
                              () => deleteReportedNote(r.id, r.note!.id),
                              '确定删除这篇笔记吗？删除后不可恢复。'
                            )
                          }
                          disabled={busyId !== null}
                          className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                        >
                          {busyId === `${r.id}-delete-note` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          删除内容
                        </button>
                      )}
                      {r.comment && (
                        <button
                          onClick={() =>
                            run(
                              `${r.id}-delete-comment`,
                              () => deleteReportedComment(r.id, r.comment!.id),
                              '确定删除这条评论吗？删除后不可恢复。'
                            )
                          }
                          disabled={busyId !== null}
                          className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                        >
                          {busyId === `${r.id}-delete-comment` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          删除评论
                        </button>
                      )}
                      {r.target_user && r.target_user.status !== 'banned' && (
                        <button
                          onClick={() =>
                            run(
                              `${r.id}-ban`,
                              () => banReportedUser(r.id, r.target_user!.id),
                              `确定封禁用户 ${r.target_user?.nickname || r.target_user?.username || '该用户'} 吗？`
                            )
                          }
                          disabled={busyId !== null}
                          className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-600 transition hover:bg-orange-100 disabled:opacity-60"
                        >
                          {busyId === `${r.id}-ban` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                          封禁用户
                        </button>
                      )}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => run(`${r.id}-resolve`, () => setReportStatus(r.id, 'resolve'))}
                          disabled={busyId !== null}
                          className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                        >
                          {busyId === `${r.id}-resolve` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          已处理
                        </button>
                        <button
                          onClick={() => run(`${r.id}-reject`, () => setReportStatus(r.id, 'reject'))}
                          disabled={busyId !== null}
                          className="flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-500 transition hover:bg-stone-50 disabled:opacity-60"
                        >
                          {busyId === `${r.id}-reject` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                          驳回举报
                        </button>
                      </div>
                    </div>
                  )}

                  {!isOpen && (
                    <span className="shrink-0 text-xs text-stone-300">
                      <Flag className="mr-1 inline h-3.5 w-3.5" />
                      已结案
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
