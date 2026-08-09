import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.catsjust.com';

let installed = false;

/** 上报运行时错误到 Web /api/error-report（写入 error_logs 表） */
export function reportError(error: unknown): void {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    fetch(`${API_BASE_URL}/api/error-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `[App] ${message}`.slice(0, 500),
        stack: stack?.slice(0, 4000) ?? null,
        url: 'catsjust-native',
        userAgent: `RN/${Platform.OS}`,
      }),
    }).catch(() => {});
  } catch {
    /* 上报失败忽略 */
  }
}

/**
 * 安装全局 JS 错误捕获（ErrorUtils + 未处理的 Promise 拒绝）。
 * 需在 App 最早处调用（index.js）。
 */
export function installGlobalErrorHandler(): void {
  if (installed) return;
  installed = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ErrorUtils = (globalThis as any).ErrorUtils as
      | { getGlobalHandler?: () => (e: unknown, isFatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, isFatal?: boolean) => void) => void }
      | undefined;
    if (ErrorUtils) {
      const prev = ErrorUtils.getGlobalHandler?.();
      ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
        reportError(error);
        prev?.(error, isFatal);
      });
    }
  } catch {
    /* ignore */
  }

  try {
    // 未处理的 Promise 拒绝
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hn = (globalThis as any).HermesInternal;
    if (hn?.enablePromiseRejectionTracker) {
      hn.enablePromiseRejectionTracker?.(({ error }: { error: unknown }) => reportError(error));
    }
  } catch {
    /* ignore */
  }
}
