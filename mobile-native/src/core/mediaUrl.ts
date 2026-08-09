/**
 * 媒体 URL 处理。
 * 原生端默认直连 Supabase Storage（Web 端走 Vercel `/_next/image` 优化，原生不需要）；
 * 保留代理切换能力：若后续视频/图片在国内直连不可靠，可把 PROXY_PREFIX 设为
 * `https://www.catsjust.com/v/` 等，由 Web 端边缘代理转发。
 */
const SUPABASE_MEDIA_PREFIX = 'https://atphtzpdclbavrplmumk.supabase.co/storage/v1/object/public/media/';

const PROXY_PREFIX = process.env.EXPO_PUBLIC_MEDIA_PROXY_PREFIX ?? '';

/** 把任意 Supabase media URL 转为最终展示 URL（后续可切代理） */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (PROXY_PREFIX && url.startsWith(SUPABASE_MEDIA_PREFIX)) {
    return url.replace(SUPABASE_MEDIA_PREFIX, PROXY_PREFIX);
  }
  return url;
}
