/**
 * 只有猫 · 多语言配置
 * 语言按用户偏好（profile.language / cookie），非 URL 前缀模式
 */

export const LOCALES = [
  { code: 'zh-Hans', label: '简体中文', rtl: false },
  { code: 'zh-Hant', label: '繁體中文', rtl: false },
  { code: 'ja', label: '日本語', rtl: false },
  { code: 'ko', label: '한국어', rtl: false },
  { code: 'en', label: 'English', rtl: false },
  { code: 'de', label: 'Deutsch', rtl: false },
  { code: 'fr', label: 'Français', rtl: false },
  { code: 'it', label: 'Italiano', rtl: false },
  { code: 'es', label: 'Español', rtl: false },
  { code: 'pt', label: 'Português', rtl: false },
  { code: 'ar', label: 'العربية', rtl: true },
] as const;

export type LocaleCode = (typeof LOCALES)[number]['code'];

export const DEFAULT_LOCALE: LocaleCode = 'zh-Hans';

export const LOCALE_COOKIE = 'catsjust_locale';

export function isLocale(v: string | undefined | null): v is LocaleCode {
  return !!v && LOCALES.some((l) => l.code === v);
}

export function getLocaleRtl(code: LocaleCode): boolean {
  return LOCALES.find((l) => l.code === code)?.rtl ?? false;
}
