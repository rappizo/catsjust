'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_COOKIE,
  createAdminSessionToken,
  safeEqual,
} from '@/lib/admin-auth';

export type AdminAuthResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/** 管理员登录：校验 env 中的账号密码，成功后写会话 cookie */
export async function adminLogin(
  _prevState: AdminAuthResult | null,
  formData: FormData
): Promise<AdminAuthResult> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const okUser = safeEqual(username, process.env.ADMIN_USERNAME || '');
  const okPass = safeEqual(password, process.env.ADMIN_PASSWORD || '');

  if (!okUser || !okPass) {
    return { ok: false, error: '用户名或密码不正确' };
  }

  cookies().set(ADMIN_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  redirect('/admin');
}

/** 管理员退出：清除会话 cookie */
export async function adminLogout(): Promise<void> {
  cookies().delete(ADMIN_COOKIE);
  redirect('/admin/login');
}
