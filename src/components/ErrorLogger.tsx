'use client';

import { useEffect } from 'react';

/**
 * 前端运行时错误监控（轻量）：
 * 捕获 window error + unhandledrejection，节流上报到 /api/error-report。
 * 只记录错误信息/URL/UA，不采集任何输入内容或密钥。
 */
export function ErrorLogger() {
  useEffect(() => {
    let last = 0;

    function report(err: { message: string; stack?: string }) {
      const now = Date.now();
      if (now - last < 5000) return; // 5s 节流，防止刷屏
      last = now;
      const payload = {
        message: (err.message || 'unknown error').slice(0, 500),
        stack: (err.stack || '').slice(0, 4000),
        url: window.location.href.slice(0, 500),
        userAgent: navigator.userAgent.slice(0, 300),
      };
      fetch('/api/error-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        /* 上报失败静默 */
      });
    }

    function onError(e: ErrorEvent) {
      report({ message: e.message, stack: e.error?.stack });
    }
    function onRejection(e: PromiseRejectionEvent) {
      const r = e.reason as { message?: string; stack?: string } | undefined;
      report({ message: r?.message || String(e.reason), stack: r?.stack });
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
