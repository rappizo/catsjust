import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * 创建 Supabase 服务端客户端。
 * @param bearerToken 可选：原生 App 通过 Authorization: Bearer <access_token> 认证时传入。
 *   token 会注入到所有请求的 Authorization header，使 PostgREST 写操作以用户身份走 RLS。
 */
export function createClient(bearerToken?: string) {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 在 Server Component 中调用时由中间件刷新 Cookie
          }
        },
      },
      global: bearerToken
        ? { headers: { Authorization: `Bearer ${bearerToken}` } }
        : undefined,
    }
  );
}
