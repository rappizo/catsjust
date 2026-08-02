'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Send } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { timeAgo } from '@/lib/utils';
import { publishDraft } from '@/lib/actions/notes';
import type { Note } from '@/lib/types';

/** 我的草稿列表（可发布/编辑） */
export function DraftList({ drafts }: { drafts: Note[] }) {
  const router = useRouter();
  const { t } = useI18n();
  const [publishing, setPublishing] = useState<string | null>(null);

  async function handlePublish(id: string) {
    if (publishing) return;
    setPublishing(id);
    const res = await publishDraft(id);
    if (res.ok) {
      router.refresh();
      if (res.id) router.push(`/notes/${res.id}`);
    }
    setPublishing(null);
  }

  if (drafts.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-stone-400">{t('publish', 'noDrafts')}</p>
    );
  }

  return (
    <ul className="space-y-2">
      {drafts.map((d) => (
        <li
          key={d.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/60 bg-white px-4 py-3 shadow-card"
        >
          <div className="flex min-w-0 items-center gap-3">
            {d.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.cover_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                <FileText className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <Link
                href={`/publish?edit=${d.id}`}
                className="block truncate text-sm font-semibold text-ink hover:text-brand-600"
              >
                {d.title || t('note', 'noTitle')}
              </Link>
              <p className="text-xs text-stone-400">
                {t('note', 'draftSavedAt')} {timeAgo(d.created_at)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/publish?edit=${d.id}`}
              className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-brand-400 hover:text-brand-600"
            >
              {t('note', 'edit')}
            </Link>
            <button
              onClick={() => handlePublish(d.id)}
              disabled={publishing === d.id}
              className="flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-3 py-1.5 text-xs font-semibold text-[#04281a] shadow transition hover:brightness-110 disabled:opacity-60"
            >
              {publishing === d.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              {t('note', 'publishDraft')}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
