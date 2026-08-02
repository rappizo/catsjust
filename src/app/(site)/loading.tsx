import { Cat as CatIcon } from 'lucide-react';
import { getLocaleFromCookies } from '@/lib/i18n/cookies';
import { getT } from '@/lib/i18n/dictionaries';

export default function Loading() {
  const t = getT(getLocaleFromCookies());
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-4 py-32 text-stone-400 sm:px-6">
      <CatIcon className="h-12 w-12 animate-bounce text-brand-400" />
      <p className="text-sm">{t('common', 'loading')}</p>
    </div>
  );
}
