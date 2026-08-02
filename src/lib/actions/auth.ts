'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ERROR_MESSAGES } from '@/lib/constants';

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
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname },
    },
  });

  if (error) {
    return { ok: false, error: friendlyError(error.message) };
  }

  return { ok: true, message: '注册成功，请前往邮箱完成验证后登录', redirectTo: '/login' };
}

/** 退出登录 */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

/** 更新个人资料 */
export async function updateProfile(input: {
  nickname: string;
  bio: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
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

  const { error } = await supabase
    .from('profiles')
    .update({
      nickname,
      bio: input.bio,
      ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
      ...(input.coverUrl !== undefined ? { cover_url: input.coverUrl } : {}),
    })
    .eq('id', user.id);

  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath('/settings');
  revalidatePath(`/profile/${user.id}`);
  return { ok: true, message: '资料已更新' };
}
