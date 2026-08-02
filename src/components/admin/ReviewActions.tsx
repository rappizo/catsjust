'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Loader2, X } from 'lucide-react';
import { reviewNote } from '@/lib/actions/admin';
import { noteStatusLabel } from '@/lib/utils';
import type { Note } from '@/lib/types';

/** 快捷驳回原因（对应社区审核规范） */
const QUICK_REJECTS = [
  { label: '与猫咪无关', reason: '内容与猫咪无关，不符合「只有猫」社区定位' },
  { label: '疑似 AI 生成', reason: '疑似 AI 生成内容（图片/视频），社区要求真实拍摄' },
  { label: '含直接广告', reason: '含直接广告宣传，产品可融入内容但不可直接推广' },
];

export function ReviewActions({ note }: { note: Note }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleApprove() {
    setBusy('approve');
    setError('');
    const res = await reviewNote(note.id, 'approve');
    if (!res.ok) setError(res.error);
    router.refresh();
    setBusy(null);
  }

  async function rejectWith(reason?: string) {
    setMenuOpen(false);
    setBusy('reject');
    setError('');
    const res = await reviewNote(note.id, 'reject', reason);
    if (!res.ok) setError(res.error);
    router.refresh();
    setBusy(null);
  }

  function handleRejectCustom() {
    setMenuOpen(false);
    const reason = window.prompt('请输入驳回原因（将展示给发布者）：');
    if (reason === null) return;
    rejectWith(reason || undefined);
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <button
          onClick={handleApprove}
          disabled={!!busy}
          className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
        >
          {busy === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          通过
        </button>

        {/* 驳回（带快捷原因菜单） */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            disabled={!!busy}
            className="flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {busy === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            驳回
            <ChevronDown className="h-3 w-3" />
          </button>
          {menuOpen && (
            <div className="animate-fade-in-up absolute right-0 top-full z-10 mt-1 w-52 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-card-hover">
              {QUICK_REJECTS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => rejectWith(q.reason)}
                  className="block w-full px-3 py-2 text-left text-xs text-stone-600 transition hover:bg-red-50 hover:text-red-500"
                >
                  <span className="font-semibold">{q.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-stone-400">{q.reason}</span>
                </button>
              ))}
              <button
                onClick={handleRejectCustom}
                className="block w-full border-t border-stone-100 px-3 py-2 text-left text-xs text-stone-400 transition hover:bg-stone-50 hover:text-stone-600"
              >
                自定义原因…
              </button>
            </div>
          )}
        </div>

        <Link
          href={`/notes/${note.id}`}
          target="_blank"
          className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-500 transition hover:bg-stone-50"
        >
          预览
        </Link>
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

export function ProcessedBadge({ status }: { status: string }) {
  return (
    <span
      className={
        status === 'published'
          ? 'rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600'
          : status === 'rejected'
          ? 'rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-500'
          : 'rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500'
      }
    >
      {noteStatusLabel(status)}
    </span>
  );
}
