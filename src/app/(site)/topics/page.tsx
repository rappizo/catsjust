import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { cn } from '@/lib/utils';
import { CAT_BREEDS } from '@/lib/constants';
import { getLocaleFromCookies } from '@/lib/i18n/cookies';
import { getT } from '@/lib/i18n/dictionaries';

export const metadata = {
  title: '话题广场',
};

export default async function TopicsPage() {
  const t = getT(getLocaleFromCookies());
  let topics: Array<{
    id: string;
    name: string;
    slug: string;
    cover_url: string | null;
    description: string | null;
    sort_order: number;
    status: string;
    created_at: string;
  }> = [];

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data } = await supabase
      .from('topics')
      .select('*')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .limit(50);
    topics = (data ?? []) as typeof topics;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">{t('topics', 'title')}</h1>
        <p className="mt-1 text-sm text-stone-400">{t('topics', 'subtitle')}</p>
      </div>

      {/* 按品种逛 */}
      <section className="mb-8 rounded-3xl border border-stone-200/60 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-fuchsia-600 text-sm text-white shadow-neon-purple">
            🐱
          </span>
          <h2 className="font-semibold text-ink">{t('topics', 'browseByBreed')}</h2>
          <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-medium text-brand-500">
            {t('topics', 'breedBadge')}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CAT_BREEDS.map((breed, i) => (
            <Link
              key={breed}
              href={`/topics/breeds/${encodeURIComponent(breed)}`}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5',
                i % 2 === 0
                  ? 'border-brand-500/40 bg-brand-500/10 text-brand-500 hover:shadow-neon-green'
                  : 'border-accent-500/40 bg-accent-500/10 text-accent-400 hover:shadow-neon-purple'
              )}
            >
              # {breed}
            </Link>
          ))}
        </div>
      </section>

      {!topics?.length ? (
        <p className="py-16 text-center text-sm text-stone-400">{t('topics', 'empty')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/topics/${topic.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              {topic.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={topic.cover_url}
                  alt={topic.name}
                  className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-40"
                />
              ) : (
                <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-brand-100 to-amber-200 text-4xl sm:h-40">
                  🐾
                </div>
              )}
              <div className="p-4">
                <p className="font-semibold text-ink"># {topic.name}</p>
                {topic.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-stone-400">{topic.description}</p>
                )}
                <span
                  className={cn(
                    'mt-2 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-600'
                  )}
                >
                  {t('topics', 'enter')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
