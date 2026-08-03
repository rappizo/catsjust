'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, X } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

const STORAGE_KEY = 'catsjust_seen_version';

/**
 * App 内版本更新提醒：
 * 仅原生 App（Capacitor WebView）生效；本地记录的上次确认版本与当前版本不一致时，
 * 在底部弹出「发现新版本」提示条，引导去下载页。
 */
export function AppUpdateChecker() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 仅在原生 App 内提醒（网页直接访问的永远是最新版，无需提醒）
    const isNative =
      typeof window !== 'undefined' &&
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ===
        true;
    if (!isNative) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) !== APP_VERSION) {
        setShow(true);
      }
    } catch {
      /* 忽略存储异常 */
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, APP_VERSION);
    } catch {
      /* 忽略 */
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-md px-4">
      <div className="flex items-center gap-3 rounded-2xl border border-brand-300 bg-white p-3 shadow-xl">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-500">
          <Download className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">发现新版本 v{APP_VERSION}</p>
          <p className="text-xs text-stone-400">点击下载最新版，体验更好</p>
        </div>
        <Link
          href="/download"
          className="shrink-0 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-4 py-1.5 text-xs font-semibold text-[#04281a] shadow-neon-green transition hover:brightness-110"
        >
          去下载
        </Link>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-full p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
