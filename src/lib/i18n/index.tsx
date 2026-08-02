'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_LOCALE, getLocaleRtl, type LocaleCode } from './config';
import { getT, type TFunction } from './dictionaries';

interface I18nContextValue {
  locale: LocaleCode;
  t: TFunction;
  rtl: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  t: getT(DEFAULT_LOCALE),
  rtl: false,
});

/** 客户端多语言 Provider：由根布局传入 locale 与词典 */
export function I18nProvider({ locale, children }: { locale: LocaleCode; children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, t: getT(locale), rtl: getLocaleRtl(locale) }}>
      {children}
    </I18nContext.Provider>
  );
}

/** 客户端组件取词：const { t } = useI18n()，然后 t('nav', 'home') */
export function useI18n() {
  return useContext(I18nContext);
}
