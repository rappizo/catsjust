'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ERROR_MESSAGES } from '@/lib/constants';
import { setLocaleCookie } from '@/lib/i18n/cookies';
import { isLocale, DEFAULT_LOCALE, type LocaleCode } from '@/lib/i18n/config';

export type ActionResult =
  | { ok: true; message?: string; redirectTo?: string }
  | { ok: false; error: string };

function friendlyError(message: string): string {
  return ERROR_MESSAGES[message] ?? message;
}

/** 邮箱 + 密码登录 */
export async function signIn(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { ok: false, error: '请输入邮箱和密码' };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, error: friendlyError(error.message) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '登录状态异常，请重试' };

  // 登录成功后：检查是否被封禁
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.status === 'banned') {
    await supabase.auth.signOut();
    return { ok: false, error: '该账号已被封禁，如有疑问请联系管理员' };
  }

  // 登录成功后：把用户偏好语言同步到 cookie
  const { data: profileLang } = await supabase
    .from('profiles')
    .select('language')
    .eq('id', user.id)
    .maybeSingle();
  if (isLocale(profileLang?.language)) {
    setLocaleCookie(profileLang.language as LocaleCode);
  }

  return { ok: true, redirectTo: '/' };
}

/** 注册（邮箱 + 密码 + 昵称） */
export async function signUp(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const nickname = String(formData.get('nickname') ?? '').trim();
  const languageRaw = String(formData.get('language') ?? '').trim();
  const language: LocaleCode = isLocale(languageRaw) ? languageRaw : DEFAULT_LOCALE;

  // 可选兴趣（注册时一步选择，可跳过）
  let interests: Array<{ type: 'topic' | 'breed'; value: string }> = [];
  try {
    const raw = String(formData.get('interests') ?? '[]');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      interests = parsed.filter(
        (i) =>
          i &&
          (i.type === 'topic' || i.type === 'breed') &&
          typeof i.value === 'string' &&
          i.value.trim() !== ''
      );
    }
  } catch {
    // 忽略非法 JSON
  }

  if (!email || !password) {
    return { ok: false, error: '请输入邮箱和密码' };
  }
  if (password.length < 6) {
    return { ok: false, error: '密码至少 6 位' };
  }
  if (!nickname) {
    return { ok: false, error: '请输入昵称' };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname, language, ...(interests.length ? { interests } : {}) },
    },
  });

  if (error) {
    return { ok: false, error: friendlyError(error.message) };
  }

  // 记住注册时选择的语言
  setLocaleCookie(language);

  // 邮箱确认已关闭时，signUp 直接返回 session（注册即登录）→ 前往关注引导
  if (data.session) {
    revalidatePath('/', 'layout');
    return { ok: true, message: '注册成功，欢迎来到只有猫！', redirectTo: '/onboarding' };
  }

  // 邮箱确认开启（项目尚未关闭确认）：需前往邮箱验证后登录
  return { ok: true, message: '注册成功，请前往邮箱完成验证后登录', redirectTo: '/login' };
}

/** 退出登录 */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

/** 忘记密码：发送密码重置邮件（由 Supabase Auth 发送，SMTP 在 Supabase 面板配置） */
export async function requestPasswordReset(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) {
    return { ok: false, error: '请输入邮箱' };
  }

  const supabase = createClient();
  const host = headers().get('host') ?? 'www.catsjust.com';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${protocol}://${host}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    return { ok: false, error: friendlyError(error.message) };
  }

  // 出于安全，无论邮箱是否注册都提示「已发送」
  return { ok: true, message: '如果该邮箱已注册，重置链接已发送，请查收邮件' };
}

/** 通过重置邮件进入后，设置新密码（需已登录会话） */
export async function updatePassword(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 6) {
    return { ok: false, error: '密码至少 6 位' };
  }
  if (password !== confirm) {
    return { ok: false, error: '两次输入的密码不一致' };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, error: friendlyError(error.message) };
  }

  return { ok: true, message: '密码已更新，请用新密码登录', redirectTo: '/login' };
}

/** 已登录用户修改密码（需验证当前密码） */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
  confirm: string
): Promise<ActionResult> {
  if (newPassword.length < 6) {
    return { ok: false, error: '新密码至少 6 位' };
  }
  if (newPassword !== confirm) {
    return { ok: false, error: '两次输入的新密码不一致' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  // 验证当前密码
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email ?? '',
    password: oldPassword,
  });
  if (verifyErr) {
    return { ok: false, error: '当前密码不正确' };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { ok: false, error: friendlyError(error.message) };
  }
  return { ok: true, message: '密码修改成功' };
}

/** 更新个人资料（含界面语言） */
export async function updateProfile(input: {
  nickname: string;
  bio: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  language?: string | null;
}): Promise<ActionResult> {
  const nickname = input.nickname.trim();
  if (!nickname) {
    return { ok: false, error: '昵称不能为空' };
  }
  if (nickname.length > 30) {
    return { ok: false, error: '昵称最多 30 字' };
  }
  if (input.bio.length > 200) {
    return { ok: false, error: '简介最多 200 字' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const language = isLocale(input.language) ? input.language : undefined;

  const { error } = await supabase
    .from('profiles')
    .update({
      nickname,
      bio: input.bio,
      ...(language !== undefined ? { language } : {}),
      ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
      ...(input.coverUrl !== undefined ? { cover_url: input.coverUrl } : {}),
    })
    .eq('id', user.id);

  if (error) return { ok: false, error: friendlyError(error.message) };

  // 语言变化立即同步到 cookie，界面即时切换
  if (language !== undefined) setLocaleCookie(language);

  revalidatePath('/settings');
  revalidatePath(`/profile/${user.id}`);
  return { ok: true, message: '资料已更新' };
}
