'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail } from 'lucide-react';
import { getOrCreateConversation } from '@/lib/actions/messages';
import { useI18n } from '@/lib/i18n';

/** 发私信按钮：进入/创建与目标用户的会话 */
export function MessageButton({ targetUserId, className = '' }: { targetUserId: string; className?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    setError('');
    const res = await getOrCreateConversation(targetUserId);
    if (res.ok && res.conversationId) {
      router.push(`/messages/conversations/${res.conversationId}`);
    } else {
      setError('error' in res ? res.error : t('profile', 'msgFailed'));
    }
    setBusy(false);
  }

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-500/20 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {t('profile', 'message')}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
