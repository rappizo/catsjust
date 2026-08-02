import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * 服务端专用客户端（使用 SUPABASE_SECRET_KEY，旧称 SERVICE_ROLE_KEY）。
 * 仅可在服务端调用（Server Component / Route Handler / Server Action），
 * 且必须先校验调用者确为管理员。
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
