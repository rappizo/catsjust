/**
 * 词典加载器：按语言返回词典
 */
import { zhHans, type Dictionary } from './zh-Hans';
import { zhHant } from './zh-Hant';
import { ja } from './ja';
import { ko } from './ko';
import { en } from './en';
import { de } from './de';
import { fr } from './fr';
import { it } from './it';
import { es } from './es';
import { pt } from './pt';
import { ar } from './ar';
import { type LocaleCode, DEFAULT_LOCALE } from './config';

const dictionaries: Record<string, Dictionary> = {
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
  ja,
  ko,
  en,
  de,
  fr,
  it,
  es,
  pt,
  ar,
};

export function getDictionary(locale: LocaleCode): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** 返回 t(section, key) 翻译函数；缺失回退到简体中文 */
export function getT(locale: LocaleCode) {
  const dict = getDictionary(locale);
  return (section: string, key: string): string => {
    const v = (dict as Record<string, Record<string, string>>)[section]?.[key];
    if (v !== undefined) return v;
    const fallback = (zhHans as Record<string, Record<string, string>>)[section]?.[key];
    return fallback !== undefined ? fallback : `${section}.${key}`;
  };
}

export type TFunction = ReturnType<typeof getT>;
