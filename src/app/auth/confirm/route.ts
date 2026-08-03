import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';

/**
 * 邮箱链接统一回调：
 * - 密码重置（recovery）：exchangeCodeForSession(code) 后跳转 /reset-password
 * - 邮箱确认（signup confirm）：verifyOtp(token_hash, type) 后跳转指定页
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/login?error=1', request.url));
  }

  const { searchParams } = new URL(request.url);
  const next = searchParams.get('next') ?? '/';
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.redirect(new URL('/login?error=1', request.url));
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'email' | 'recovery' | 'invite',
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.redirect(new URL('/login?error=1', request.url));
  }

  // 无效链接
  return NextResponse.redirect(new URL('/login?error=1', request.url));
}
