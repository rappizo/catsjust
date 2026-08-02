import type { SupabaseClient } from '@supabase/supabase-js';
import type { StorageBackend, StorageBackendName } from '../types';
import { createSupabaseBackend } from './supabase';
import { createVercelBlobBackend } from './vercel-blob';
import { createR2Backend } from './r2';

/**
 * 存储后端工厂：根据环境变量 NEXT_PUBLIC_STORAGE_BACKEND 选择后端。
 * 默认 supabase；未来切换 vercel-blob / r2 时只需改环境变量 + 完善对应后端实现，
 * 所有调用方（uploadFile / uploadAvatar / uploadCover）无需改动。
 */
export function getStorageBackend(client: SupabaseClient): StorageBackend {
  const name = (process.env.NEXT_PUBLIC_STORAGE_BACKEND || 'supabase') as StorageBackendName;
  switch (name) {
    case 'vercel-blob':
      return createVercelBlobBackend();
    case 'r2':
      return createR2Backend();
    case 'supabase':
    default:
      return createSupabaseBackend(client);
  }
}
