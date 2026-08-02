'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Loader2, Undo2 } from 'lucide-react';
import { setUserBanStatus } from '@/lib/actions/admin';

export function UserActions({
  userId,
  status,
  isSelf,
}: {
  userId: string;
  status: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const banned = status === 'banned';

  async function handleToggle() {
    if (isSelf) return;
    if (banned) {
      if (!window.confirm('确认解封该用户？')) return;
    } else {
      if (!window.confirm('确认封禁该用户？封禁后其内容对他人不可见。')) return;
    }
    setBusy(true);
    setError('');
    const res = await setUserBanStatus(userId, !banned);
    if (!res.ok) setError(res.error);
    router.refresh();
    setBusy(false);
  }

  if (isSelf) {
    return <span className="text-xs text-stone-300">（当前账号）</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleToggle}
        disabled={busy}
        className={
          banned
            ? 'flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-60'
            : 'flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-100 disabled:opacity-60'
        }
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : banned ? (
          <Undo2 className="h-3.5 w-3.5" />
        ) : (
          <Ban className="h-3.5 w-3.5" />
        )}
        {banned ? '解封' : '封禁'}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
