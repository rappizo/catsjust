import type { ReactNode } from 'react';
import { cn, noteStatusLabel } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600 border-amber-200',
  published: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  rejected: 'bg-red-50 text-red-500 border-red-200',
  removed: 'bg-stone-100 text-stone-500 border-stone-200',
};

export function StatusBadge({
  status,
  extra,
}: {
  status: string;
  extra?: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] ?? 'bg-stone-100 text-stone-500'
      )}
    >
      {noteStatusLabel(status)}
      {extra}
    </span>
  );
}
