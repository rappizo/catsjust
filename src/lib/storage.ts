import type { SupabaseClient } from '@supabase/supabase-js';
import { fileExtension } from './utils';
import { getStorageBackend } from './storage/backends';

/** 桶名（兼容旧导出；新代码建议直接传 'media' | 'avatars' 字面量） */
export const MEDIA_BUCKET = 'media';
export const AVATAR_BUCKET = 'avatars';

/** 生成媒体文件路径：{userId}/{folder}/{uuid}.{ext} */
function mediaKey(userId: string, folder: 'images' | 'videos' | 'covers', file: File): string {
  return `${userId}/${folder}/${crypto.randomUUID()}.${fileExtension(file)}`;
}

/**
 * 上传笔记媒体（图片 / 视频 / 封面）到存储后端。
 *
 * 存储后端由 NEXT_PUBLIC_STORAGE_BACKEND 决定（默认 supabase）：
 * - supabase    ：Supabase Storage 客户端直传（现状，见 storage/backends/supabase.ts）
 * - vercel-blob ：Vercel Blob（预留，见 storage/backends/vercel-blob.ts）
 * - r2          ：Cloudflare R2（预留，推荐给大量视频，见 storage/backends/r2.ts）
 *
 * 切换后端无需改动任何调用方。
 */
export async function uploadFile(
  client: SupabaseClient,
  file: File,
  userId: string,
  folder: 'images' | 'videos' | 'covers'
): Promise<string> {
  return getStorageBackend(client).put({
    bucket: MEDIA_BUCKET,
    key: mediaKey(userId, folder, file),
    file,
    contentType: file.type || undefined,
  });
}

/** 上传头像（同名覆盖） */
export async function uploadAvatar(
  client: SupabaseClient,
  file: File,
  userId: string
): Promise<string> {
  return getStorageBackend(client).put({
    bucket: AVATAR_BUCKET,
    key: `${userId}/avatar.${fileExtension(file)}`,
    file,
    contentType: file.type || undefined,
    upsert: true,
  });
}

/** 上传个人主页封面（同名覆盖，复用 media 桶 covers 目录） */
export async function uploadCover(
  client: SupabaseClient,
  file: File,
  userId: string
): Promise<string> {
  const ext = fileExtension(file);
  return getStorageBackend(client).put({
    bucket: MEDIA_BUCKET,
    key: `${userId}/covers/cover.${ext}`,
    file,
    contentType: file.type || undefined,
    upsert: true,
  });
}
