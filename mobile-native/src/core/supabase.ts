import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  const isPlaceholder = (v: string) => !v || v.includes('REPLACE') || v.includes('YOUR_');
  return supabaseUrl.startsWith('https://') && !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseKey);
}

/**
 * 单例 Supabase 客户端。
 * session 持久化用 AsyncStorage（Supabase RN 官方推荐）：
 * 注意不用 SecureStore —— Supabase session（JWT + refresh token + user）可能超过
 * SecureStore 的 2KB 限制；N3 再做更严格的安全存储策略。
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
