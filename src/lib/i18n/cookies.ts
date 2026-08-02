/**
 * 语言 cookie 服务端助手（仅服务端使用）
 */
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, DEFAULT_LOCALE, isLocale, type LocaleCode } from './config';

export function getLocaleFromCookies(): LocaleCode {
  const c = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(c) ? c : DEFAULT_LOCALE;
}

export function setLocaleCookie(locale: LocaleCode): void {
  cookies().set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
