'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { deleteNote } from '@/lib/actions/notes';
import { useI18n } from '@/lib/i18n';

export function NoteDeleteButton({ noteId }: { noteId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setBusy(true);
    const res = await deleteNote(noteId);
    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      alert(res.error);
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        confirming
          ? 'bg-red-500 text-white hover:bg-red-600'
          : 'text-stone-400 hover:bg-red-50 hover:text-red-500'
      }`}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      {confirming ? t('note', 'confirmDelete') : t('note', 'deleteNote')}
    </button>
  );
}
