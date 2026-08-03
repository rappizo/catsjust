'use client';

import { useState } from 'react';
import { Megaphone, X } from 'lucide-react';

interface AnnouncementBarProps {
  id: string;
  title: string;
  content: string;
}

/** 首页顶部公告条（可关闭，本地记忆） */
export function AnnouncementBar({ id, title, content }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(`catsjust_ann_${id}`) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  return (
    <div className="mb-3 flex items-center gap-2 rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-2.5">
      <Megaphone className="h-4 w-4 shrink-0 text-brand-500" />
      <div className="min-w-0 flex-1 text-xs leading-relaxed text-stone-300">
        <span className="font-semibold text-brand-400">{title}：</span>
        <span className="line-clamp-2">{content}</span>
      </div>
      <button
        onClick={() => {
          try {
            localStorage.setItem(`catsjust_ann_${id}`, '1');
          } catch {
            /* 忽略 */
          }
          setDismissed(true);
        }}
        className="shrink-0 rounded-full p-1 text-stone-400 transition hover:bg-brand-500/20 hover:text-brand-400"
        aria-label="关闭公告"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
