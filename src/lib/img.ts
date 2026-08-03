/**
 * 图片加载优化：生成 Next.js 图片优化 URL（Vercel 边缘缩放 + WebP 压缩）。
 * 瀑布流/卡片等缩略场景用较小宽度，大幅减少图片传输体积（原图常 1-2MB，缩略图仅几十 KB）。
 */

const STORAGE_ORIGIN = 'https://atphtzpdclbavrplmumk.supabase.co/storage/v1/object/public/';

/**
 * 将 Supabase Storage 公开图片 URL 转成 Vercel 边缘优化 URL。
 * 非 Supabase 图片（blob:/data: 等）原样返回。
 * @param src 图片 URL
 * @param width 目标宽度（px，2x 屏建议为实际显示宽度的 2 倍）
 * @param quality 压缩质量（1-100，默认 75）
 */
export function thumbUrl(src: string | null | undefined, width = 600, quality = 75): string {
  if (!src) return '';
  if (!src.startsWith(STORAGE_ORIGIN)) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
