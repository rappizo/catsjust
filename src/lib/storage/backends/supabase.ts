import type { SupabaseClient } from '@supabase/supabase-js';
import type { StorageBackend, StorageObject } from '../types';

/**
 * Supabase Storage 后端（当前默认）。
 * 客户端直传 + bucket RLS 存储策略，路径与访问均走 Supabase。
 */
export function createSupabaseBackend(client: SupabaseClient): StorageBackend {
  return {
    name: 'supabase',
    async put({ bucket, key, file, contentType, upsert }) {
      const { error } = await client.storage.from(bucket).upload(key, file, {
        cacheControl: '3600',
        upsert: upsert ?? false,
        contentType: contentType || undefined,
      });
      if (error) throw new Error(`上传失败：${error.message}`);
      const { data } = client.storage.from(bucket).getPublicUrl(key);
      return data.publicUrl;
    },
  };
}
