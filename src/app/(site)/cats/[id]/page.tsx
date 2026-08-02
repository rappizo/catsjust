import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cake, PawPrint } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Waterfall } from '@/components/Waterfall';
import { Avatar } from '@/components/Avatar';
import { formatDate } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/config';
import { getLocaleFromCookies } from '@/lib/i18n/cookies';
import { getT } from '@/lib/i18n/dictionaries';
import type { Cat, Note } from '@/lib/types';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  if (!isSupabaseConfigured()) {
    return { title: '猫咪主页' };
  }
  const supabase = createClient();
  const { data: cat } = await supabase
    .from('cats')
    .select('name')
    .eq('id', params.id)
    .maybeSingle();
  return {
    title: cat?.name ? `${cat.name} 的猫咪主页` : '猫咪主页',
  };
}

export default async function CatPage({ params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) notFound();

  const t = getT(getLocaleFromCookies());
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: cat } = await supabase
    .from('cats')
    .select('*, owner:profiles(*)')
    .eq('id', params.id)
    .maybeSingle();

  if (!cat) notFound();

  const typedCat = cat as Cat & { owner?: { id: string; nickname: string; username: string; avatar_url: string | null } };
  const isOwner = user?.id === typedCat.owner_id;

  const { data: notes } = await supabase
    .from('notes')
    .select('*, author:profiles(*)')
    .eq('cat_id', typedCat.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(12);

  const typedNotes = (notes ?? []) as Note[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* 猫咪主页头 */}
      <div className="overflow-hidden rounded-3xl border border-stone-200/60 bg-white shadow-card">
        <div className="relative h-40 w-full bg-gradient-to-r from-brand-400 via-orange-300 to-amber-200 sm:h-52">
          <span className="pointer-events-none absolute bottom-1 right-8 select-none text-8xl opacity-30">
            🐈
          </span>
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-wrap items-end gap-4">
            <span className="rounded-full border-4 border-white shadow">
              <Avatar src={typedCat.avatar_url} alt={typedCat.name} size="xl" />
            </span>
            <div className="flex-1 pb-1">
              <h1 className="flex items-center gap-2 text-xl font-bold text-ink sm:text-2xl">
                {typedCat.name}
                {typedCat.breed && (
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600">
                    {typedCat.breed}
                  </span>
                )}
              </h1>
              {typedCat.owner && (
                <LinkToOwner owner={typedCat.owner} />
              )}
            </div>
          </div>

          {/* 信息卡 */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoCard
              label={t('cat', 'gender')}
              value={
                typedCat.gender === 'male'
                  ? t('cat', 'genderMale')
                  : typedCat.gender === 'female'
                    ? t('cat', 'genderFemale')
                    : t('cat', 'genderUnknown')
              }
            />
            <InfoCard
              label={t('cat', 'birthday')}
              value={typedCat.birthday ? formatDate(typedCat.birthday) : t('cat', 'unknown')}
            />
            <InfoCard label={t('cat', 'noteCount')} value={`${typedNotes.length}`} />
            <InfoCard
              label={t('cat', 'personality')}
              value={typedCat.personality_tags.length ? typedCat.personality_tags.slice(0, 3).join(' · ') : t('cat', 'locked')}
            />
          </div>

          {typedCat.bio && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
              {typedCat.bio}
            </p>
          )}

          {/* 性格标签 */}
          {typedCat.personality_tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {typedCat.personality_tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600"
                >
                  <PawPrint className="h-3 w-3 text-brand-500" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 猫咪作品 */}
      <div className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
          <Cake className="h-5 w-5 text-brand-500" />
          {t('cat', 'daily').replace('{name}', typedCat.name)}
        </h2>
        <Waterfall
          initialNotes={typedNotes}
          staticMode
          emptyTitle={t('cat', 'noContent')}
          emptyDescription={isOwner ? t('cat', 'ownerEmpty') : t('cat', 'visitorEmpty')}
        />
      </div>
    </div>
  );
}

function LinkToOwner({
  owner,
}: {
  owner: { id: string; nickname: string; username: string; avatar_url: string | null };
}) {
  return (
    <Link href={`/profile/${owner.username}`} className="flex items-center gap-2 text-xs text-stone-400 transition hover:text-brand-500">
      <Avatar src={owner.avatar_url} alt={owner.nickname} size="sm" />
      <span>{owner.nickname} 的猫</span>
    </Link>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 px-4 py-3">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-stone-700">{value}</p>
    </div>
  );
}
