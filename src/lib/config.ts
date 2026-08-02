/**
 * 判断 Supabase 是否已完成真实配置。
 * 未配置（仍是占位符）时，数据页面优雅降级，便于在填密钥前预览界面。
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  const isPlaceholder = (v: string) =>
    !v || v.includes('REPLACE') || v.includes('YOUR_');
  return url.startsWith('https://') && !isPlaceholder(url) && !isPlaceholder(key);
}
