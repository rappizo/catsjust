export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * 分享：优先调用系统分享面板（navigator.share，App/手机可分享到微信等），
 * 不支持或用户取消时回退为复制链接。
 */
export async function shareContent(opts: {
  url: string;
  title?: string;
  text?: string;
}): Promise<ShareResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ url: opts.url, title: opts.title, text: opts.text });
      return 'shared';
    } catch (e) {
      // 用户取消分享 → 不处理；其它异常 → 回退复制
      if ((e as { name?: string })?.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }
  try {
    await navigator.clipboard.writeText(opts.url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
