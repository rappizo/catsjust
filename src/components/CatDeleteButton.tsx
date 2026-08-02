'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { deleteCat } from '@/lib/actions/cats';

interface CatDeleteButtonProps {
  catId: string;
  catName: string;
}

/** 删除猫咪档案（仅本人，需二次确认） */
export function CatDeleteButton({ catId, catName }: CatDeleteButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setBusy(true);
    const res = await deleteCat(catId);
    if (res.ok) {
      router.push('/cats');
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
      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
        confirming
          ? 'border-red-500 bg-red-500 text-white'
          : 'border-stone-200 bg-white text-stone-500 hover:border-red-300 hover:text-red-500'
      }`}
      title={confirming ? `确认删除「${catName}」？` : '删除档案'}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      {confirming ? `确认删除「${catName}」？` : '删除档案'}
    </button>
  );
}
