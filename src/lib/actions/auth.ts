'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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

  // 登录成功后：把用户偏好语言同步到 cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('language')
      .eq('id', user.id)
      .maybeSingle();
    if (isLocale(profile?.language)) {
      setLocaleCookie(profile.language as LocaleCode);
    }
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

  // 邮箱确认已关闭时，signUp 直接返回 session（注册即登录）
  if (data.session) {
    revalidatePath('/', 'layout');
    return { ok: true, message: '注册成功，欢迎来到只有猫！', redirectTo: '/' };
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
