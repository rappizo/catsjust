import Link from 'next/link';
import { Search as SearchIcon, FileText, User as UserIcon, Hash, PawPrint } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { Avatar } from '@/components/Avatar';
import { NoteCard } from '@/components/NoteCard';
import { CAT_BREEDS } from '@/lib/constants';
import { getLocaleFromCookies } from '@/lib/i18n/cookies';
import { getT } from '@/lib/i18n/dictionaries';
import { cn } from '@/lib/utils';
import type { Cat, Note, Profile, Topic } from '@/lib/types';

export const metadata = { title: '搜索' };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const t = getT(getLocaleFromCookies());
  const q = (searchParams.q ?? '').trim();

  let notes: Note[] = [];
  let profiles: Profile[] = [];
  let topics: Topic[] = [];
  let cats: Cat[] = [];
  const breedHits: string[] = [];

  if (q && isSupabaseConfigured()) {
    const supabase = createClient();

    const [notesRes, profilesRes, topicsRes, catsRes] = await Promise.all([
      supabase
        .from('notes')
        .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
        .eq('status', 'published')
        .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('profiles')
        .select('*')
        .eq('status', 'active')
        .or(`nickname.ilike.%${q}%,username.ilike.%${q}%,bio.ilike.%${q}%`)
        .limit(10),
      supabase
        .from('topics')
        .select('*')
        .eq('status', 'active')
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(10),
      supabase
        .from('cats')
        .select('*')
        .eq('status', 'active')
        .or(`name.ilike.%${q}%,breed.ilike.%${q}%,bio.ilike.%${q}%`)
        .limit(10),
    ]);

    notes = (notesRes.data ?? []) as Note[];
    profiles = (profilesRes.data ?? []) as Profile[];
    topics = (topicsRes.data ?? []) as Topic[];
    cats = (catsRes.data ?? []) as Cat[];

    // 品种词典（本地常量）模糊匹配
    breedHits.push(...CAT_BREEDS.filter((b) => b.includes(q)));
  }

  const hasQuery = q.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <SearchIcon className="h-6 w-6 text-brand-500" />
          {t('search', 'title')}
        </h1>

        {/* 搜索框 */}
        <form action="/search" method="get" className="mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder={t('search', 'placeholder')}
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-neon-green transition hover:brightness-110"
            >
              <SearchIcon className="h-4 w-4" />
              {t('search', 'go')}
            </button>
          </div>
        </form>
      </div>

      {!hasQuery ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-stone-200/60 bg-white py-20 text-center shadow-card">
          <SearchIcon className="h-10 w-10 text-stone-300" />
          <p className="text-sm text-stone-400">{t('search', 'hint')}</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* 内容 */}
          <section>
            <SectionTitle icon={<FileText className="h-4 w-4 text-brand-500" />} label={t('search', 'notes')} />
            {notes.length === 0 ? (
              <p className="py-4 text-sm text-stone-400">{t('search', 'noNotes')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {notes.map((n) => (
                  <NoteCard key={n.id} note={n} />
                ))}
              </div>
            )}
          </section>

          {/* 用户 */}
          <section>
            <SectionTitle icon={<UserIcon className="h-4 w-4 text-accent-400" />} label={t('search', 'users')} />
            {profiles.length === 0 ? (
              <p className="py-4 text-sm text-stone-400">{t('search', 'noUsers')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {profiles.map((p) => (
                  <Link
                    key={p.id}
                    href={`/profile/${p.username}`}
                    className="flex items-center gap-3 rounded-2xl border border-stone-200/60 bg-white px-4 py-3 shadow-card transition hover:border-brand-300"
                  >
                    <Avatar src={p.avatar_url} alt={p.nickname || p.username} size="md" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{p.nickname || p.username}</p>
                      <p className="truncate text-xs text-stone-400">@{p.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* 话题 */}
          <section>
            <SectionTitle icon={<Hash className="h-4 w-4 text-amber-500" />} label={t('search', 'topics')} />
            {topics.length === 0 ? (
              <p className="py-4 text-sm text-stone-400">{t('search', 'noTopics')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topics.map((tp) => (
                  <Link
                    key={tp.id}
                    href={`/topics/${tp.slug}`}
                    className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-600 transition hover:border-brand-400 hover:text-brand-600"
                  >
                    # {tp.name}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* 猫咪 */}
          <section>
            <SectionTitle icon={<PawPrint className="h-4 w-4 text-rose-400" />} label={t('search', 'cats')} />
            {cats.length === 0 ? (
              <p className="py-4 text-sm text-stone-400">{t('search', 'noCats')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cats.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cats/${c.id}`}
                    className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-600 transition hover:border-brand-400 hover:text-brand-600"
                  >
                    <span>{c.avatar_url ? '🐾' : '🐱'}</span>
                    {c.name}
                    {c.breed && <span className="text-xs text-stone-400">· {c.breed}</span>}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* 品种 */}
          <section>
            <SectionTitle icon={<span className="text-sm">🐈</span>} label={t('search', 'breeds')} />
            {breedHits.length === 0 ? (
              <p className="py-4 text-sm text-stone-400">{t('search', 'noBreeds')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {breedHits.map((b) => (
                  <Link
                    key={b}
                    href={`/topics/breeds/${encodeURIComponent(b)}`}
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-sm transition',
                      'border-accent-500/40 bg-accent-500/10 text-accent-400 hover:shadow-neon-purple'
                    )}
                  >
                    # {b}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* 全部为空 */}
          {notes.length === 0 &&
            profiles.length === 0 &&
            topics.length === 0 &&
            cats.length === 0 &&
            breedHits.length === 0 && (
              <p className="py-16 text-center text-sm text-stone-400">
                {t('search', 'empty').replace('{q}', q)}
              </p>
            )}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-ink">
      {icon}
      {label}
    </h2>
  );
}
