import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { getSupabase } from '@/core/supabase';

/** 最长边压缩阈值与尺寸（对齐 Web compressImageFile：>2MB 压缩，最长边 2048，质量 0.85） */
const COMPRESS_THRESHOLD = 2 * 1024 * 1024;
const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.85;

export interface PickedMedia {
  uri: string;
  type: 'image' | 'video';
  mimeType?: string;
  /** 压缩后的宽高（图片） */
  width?: number;
  height?: number;
}

/**
 * 图片压缩（对齐 Web 端规则）：
 * - 原图 ≤2MB 不压缩，只取尺寸
 * - >2MB 按最长边 2048 等比缩放 + JPEG 质量 0.85
 */
export async function compressImage(uri: string): Promise<{ uri: string; width: number; height: number }> {
  try {
    // SDK 57：旧 getInfoAsync 运行时已 throw，改用 File.size 获取大小
    const size = new File(uri).size ?? 0;
    if (size <= COMPRESS_THRESHOLD) {
      // 小图：仅读取尺寸
      const probe = await ImageManipulator.manipulateAsync(uri, [], { compress: 1 });
      return { uri, width: probe.width, height: probe.height };
    }
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_EDGE } }],
      { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    return { uri: result.uri, width: result.width, height: result.height };
  } catch {
    // 压缩失败回退原图
    return { uri, width: 0, height: 0 };
  }
}

function extFor(mime: string | undefined, type: 'image' | 'video'): string {
  const e = mime?.split('/')[1]?.split(';')[0];
  if (e && /^[a-z0-9]+$/i.test(e)) return e;
  return type === 'image' ? 'jpg' : 'mp4';
}

/**
 * 上传媒体到 Supabase Storage（客户端直传，路径 media/{userId}/images|videos/{uuid}.{ext}）。
 * 返回公开 URL。
 */
export async function uploadMedia(
  media: PickedMedia,
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  const folder = media.type === 'image' ? 'images' : 'videos';
  const ext = extFor(media.mimeType, media.type);
  const key = `${userId}/${folder}/${Crypto.randomUUID()}.${ext}`;

  // SDK 57：RN fetch 不支持 file:// URI，改用 File.bytes() 读字节直传
  const file = new File(media.uri);
  const bytes = await file.bytes();

  const { error } = await supabase.storage.from('media').upload(key, bytes, {
    contentType: media.mimeType || (media.type === 'image' ? 'image/jpeg' : 'video/mp4'),
    cacheControl: '3600',
  });
  if (error) throw new Error(`上传失败：${error.message}`);

  const { data } = supabase.storage.from('media').getPublicUrl(key);
  return data.publicUrl;
}
