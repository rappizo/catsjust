'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createReport } from '@/lib/actions/reports';
import { REPORT_REASONS } from '@/lib/constants';

interface ReportDialogProps {
  /** 举报对象：笔记 / 评论 / 用户，三者至少传一个 */
  noteId?: string | null;
  commentId?: string | null;
  targetUserId?: string | null;
  /** 触发按钮样式（默认：小号“举报”文字按钮） */
  className?: string;
  label?: string;
  /** dark：用于深色背景（如全屏信息流），按钮为半透明白 */
  variant?: 'default' | 'dark';
}

/** 通用举报弹窗：登录用户可提交举报工单 */
export function ReportDialog({
  noteId,
  commentId,
  targetUserId,
  className,
  label = '举报',
  variant = 'default',
}: ReportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  function openDialog() {
    setMessage(null);
    setReason('');
    setDetail('');
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);
    const res = await createReport({
      reason,
      detail,
      noteId,
      commentId,
      targetUserId,
    });
    if (res.ok) {
      setMessage({ type: 'ok', text: res.message });
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 1200);
    } else {
      setMessage({ type: 'error', text: res.error });
    }
    setSubmitting(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={cn(
          variant === 'dark'
            ? 'flex items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 backdrop-blur-sm transition hover:border-red-400 hover:bg-red-500/20 hover:text-red-300'
            : 'flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500',
          className
        )}
      >
        <Flag className="h-3.5 w-3.5" />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div
            className="animate-fade-in-up w-full max-w-md rounded-2xl bg-white p-6 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">举报</h3>
              <button onClick={() => setOpen(false)} className="text-stone-400 transition hover:text-stone-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-stone-600">请选择举报原因</p>
                <div className="flex flex-wrap gap-2">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={cn(
                        'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
                        reason === r
                          ? 'bg-red-500 text-white'
                          : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-600">
                  补充说明（可选）
                </label>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="请描述违规的具体情况，方便管理员快速处理…"
                  className="w-full resize-none rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-50"
                />
                <div className="mt-1 text-right text-xs text-stone-300">{detail.length}/500</div>
              </div>

              {message && (
                <p
                  className={cn(
                    'rounded-xl px-4 py-2.5 text-sm',
                    message.type === 'ok' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                  )}
                >
                  {message.text}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !reason}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                提交举报
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
