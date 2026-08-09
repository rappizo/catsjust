import { getSupabase } from '@/core/supabase';
import { ERROR_MESSAGES } from '@/core/constants';

export type AuthResult = { ok: true } | { ok: false; error: string };

function friendlyError(message: string): string {
  return ERROR_MESSAGES[message] ?? message;
}

/** 邮箱 + 密码登录（含封禁校验，与 Web signIn 逻辑一致） */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!email || !password) {
    return { ok: false, error: '请输入邮箱和密码' };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: friendlyError(error.message) };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '登录状态异常，请重试' };

  // 封禁校验：banned 直接登出并报错（对齐 Web BannedGate 行为）
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.status === 'banned') {
    await supabase.auth.signOut();
    return { ok: false, error: '该账号已被封禁，如有疑问请联系管理员' };
  }

  return { ok: true };
}

/** 注册（邮箱 + 密码 + 昵称；邮箱确认已关闭，注册即登录） */
export async function signUp(email: string, password: string, nickname: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!email || !password) return { ok: false, error: '请输入邮箱和密码' };
  if (password.length < 6) return { ok: false, error: '密码至少 6 位' };
  if (!nickname.trim()) return { ok: false, error: '请输入昵称' };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname } },
  });
  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true };
}

/** 退出登录 */
export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
}
