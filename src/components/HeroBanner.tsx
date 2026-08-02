'use client';

import { useI18n } from '@/lib/i18n';

/**
 * 标语横幅：展示在登录 / 注册页。
 * 首页不再展示标语，直接进入内容瀑布流。
 */
export function HeroBanner() {
  const { t } = useI18n();
  return (
    <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-accent-500 to-fuchsia-600 px-6 py-8 text-white shadow-lg shadow-neon-green sm:px-10">
      <span className="pointer-events-none absolute -left-4 -top-6 select-none text-7xl opacity-20 sm:text-8xl">
        🐱
      </span>
      <span className="pointer-events-none absolute right-6 top-4 select-none text-4xl opacity-25 sm:text-5xl">
        🐾
      </span>
      <span className="pointer-events-none absolute bottom-1 right-24 hidden select-none text-5xl opacity-20 sm:block">
        😺
      </span>
      <div className="relative max-w-xl">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/80">
          {t('hero', 'eyebrow')}
        </p>
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
          {t('hero', 'title')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/90">
          {t('hero', 'subtitle')}
        </p>
      </div>
    </section>
  );
}
