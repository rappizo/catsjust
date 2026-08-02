import Link from 'next/link';
import { Cat as CatIcon } from 'lucide-react';
import { getLocaleFromCookies } from '@/lib/i18n/cookies';
import { getT } from '@/lib/i18n/dictionaries';

export default function NotFound() {
  const t = getT(getLocaleFromCookies());
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <CatIcon className="h-16 w-16 text-stone-300" />
      <h1 className="text-2xl font-bold text-stone-700">{t('common', 'notFoundTitle')}</h1>
      <p className="text-sm text-stone-400">{t('common', 'notFoundDesc')}</p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-[#04281a] transition hover:bg-brand-600"
      >
        回到首页
      </Link>
    </div>
  );
}
