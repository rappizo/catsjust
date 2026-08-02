'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/** CATSJUST ID：显示 @username，点击一键复制 */
export function CopyId({ username }: { username: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`@${username}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // 剪贴板不可用时静默失败
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="group inline-flex max-w-full items-center gap-1.5 text-sm text-stone-400 transition hover:text-brand-500"
      title={t('profile', 'copyId')}
      aria-label={t('profile', 'copyId')}
    >
      <span className="truncate">@{username}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
      )}
    </button>
  );
}
