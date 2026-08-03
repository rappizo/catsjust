/** Supabase media 公开目录的存储根地址 */
const SUPABASE_MEDIA_BASE =
  'https://atphtzpdclbavrplmumk.supabase.co/storage/v1/object/public/media/';

/**
 * 把 Supabase 存储直链转换为本站 `/v/*` 代理路径，
 * 让视频/大文件走 Vercel 全球边缘缓存（比直连 AWS 美东快）。
 * 非本站存储地址原样返回（如本地预览 blob、第三方外链）。
 */
export function proxyMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith(SUPABASE_MEDIA_BASE)) {
    return `/v/${url.slice(SUPABASE_MEDIA_BASE.length)}`;
  }
  return url;
}
