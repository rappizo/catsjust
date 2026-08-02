'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
import { reviewNote } from '@/lib/actions/admin';
import { noteStatusLabel } from '@/lib/utils';
import type { Note } from '@/lib/types';

export function ReviewActions({ note }: { note: Note }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');

  async function handleApprove() {
    setBusy('approve');
    setError('');
    const res = await reviewNote(note.id, 'approve');
    if (!res.ok) setError(res.error);
    router.refresh();
    setBusy(null);
  }

  async function handleReject() {
    const reason = window.prompt('请输入驳回原因（选填，将展示给发布者）：');
    if (reason === null) return;
    setBusy('reject');
    setError('');
    const res = await reviewNote(note.id, 'reject', reason || undefined);
    if (!res.ok) setError(res.error);
    router.refresh();
    setBusy(null);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleApprove}
        disabled={!!busy}
        className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
      >
        {busy === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        通过
      </button>
      <button
        onClick={handleReject}
        disabled={!!busy}
        className="flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
      >
        {busy === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        驳回
      </button>
      <Link
        href={`/notes/${note.id}`}
        target="_blank"
        className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-500 transition hover:bg-stone-50"
      >
        预览
      </Link>
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
