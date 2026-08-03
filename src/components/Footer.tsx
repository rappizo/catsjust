import Link from 'next/link';
import { Cat as CatIcon, Heart } from 'lucide-react';
import { getLocaleFromCookies } from '@/lib/i18n/cookies';
import { getT } from '@/lib/i18n/dictionaries';

export function Footer() {
  const t = getT(getLocaleFromCookies());
  return (
    <footer className="mt-16 border-t border-stone-200/70 bg-white/60 pb-20">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-8 text-center sm:px-6">
        <div className="flex items-center gap-2 text-stone-500">
          <CatIcon className="h-5 w-5 text-brand-500" />
          <span className="font-semibold text-stone-700">
            只有猫
            <span className="ml-1 text-[10px] font-medium tracking-widest text-accent-400">
              CATSJUST
            </span>
          </span>
        </div>
        <p className="flex items-center gap-1 text-xs text-stone-400">
          {t('footer', 'tagline')}
          <Heart className="h-3 w-3 text-rose-400" />
        </p>
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <Link href="/topics" className="transition hover:text-brand-500">
            {t('footer', 'topics')}
          </Link>
          <span>·</span>
          <Link href="/download" className="transition hover:text-brand-500">
            {t('footer', 'download')}
          </Link>
          <span>·</span>
          <Link href="/terms" className="transition hover:text-brand-500">
            {t('footer', 'tos')}
          </Link>
          <span>·</span>
          <Link href="/privacy" className="transition hover:text-brand-500">
            {t('footer', 'privacy')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
