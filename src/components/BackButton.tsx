'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/** 返回按钮：有历史则返回上一页，否则回首页 */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200"
      aria-label="返回"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
