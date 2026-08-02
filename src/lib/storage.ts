import type { SupabaseClient } from '@supabase/supabase-js';
import { fileExtension } from './utils';

export const MEDIA_BUCKET = 'media';
export const AVATAR_BUCKET = 'avatars';

/**
 * 上传文件到 Supabase Storage（客户端直传）。
 * 路径规则：{bucket}/{userId}/{folder}/{uuid}.{ext}，配合 RLS 存储策略。
 */
export async function uploadFile(
  client: SupabaseClient,
  file: File,
  userId: string,
  folder: 'images' | 'videos' | 'covers'
): Promise<string> {
  const ext = fileExtension(file);
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await client.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) throw new Error(`上传失败：${error.message}`);

  const { data } = client.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** 上传头像 */
export async function uploadAvatar(
  client: SupabaseClient,
  file: File,
  userId: string
): Promise<string> {
  const ext = fileExtension(file);
  const path = `${userId}/avatar.${ext}`;

  const { error } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || undefined,
    });

  if (error) throw new Error(`上传失败：${error.message}`);

  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
