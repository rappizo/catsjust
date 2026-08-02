import { createClient } from '@/lib/supabase/server';
import { CatsPlaza, type CatCardData } from '@/components/CatsPlaza';
import { getLocaleFromCookies } from '@/lib/i18n/cookies';
import { getT } from '@/lib/i18n/dictionaries';
import { isSupabaseConfigured } from '@/lib/config';

export const metadata = { title: '猫咪广场' };

export default async function CatsPlazaPage() {
  const t = getT(getLocaleFromCookies());

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          ⚠️ Supabase 尚未配置，无法加载猫咪数据。
        </p>
      </div>
    );
  }

  const supabase = createClient();

  const [catsRes, breedsRes] = await Promise.all([
    supabase
      .from('cats')
      .select(
        'id, name, breed, gender, bio, avatar_url, owner:profiles(id, username, nickname, avatar_url), notes:notes(count)'
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('breeds')
      .select('name')
      .eq('status', 'active')
      .order('sort_order', { ascending: true }),
  ]);

  const cats: CatCardData[] = (catsRes.data ?? []).map((c: any) => {
    const owner = Array.isArray(c.owner) ? c.owner[0] : c.owner;
    const count = Array.isArray(c.notes) ? (c.notes[0] as any)?.count : undefined;
    return {
      id: c.id,
      name: c.name,
      breed: c.breed,
      gender: c.gender,
      bio: c.bio,
      avatar_url: c.avatar_url,
      note_count: typeof count === 'number' ? count : undefined,
      owner: owner ?? null,
    };
  });
  const breeds = (breedsRes.data ?? []).map((b: any) => b.name);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink sm:text-2xl">
          🐾 {t('cats', 'title')}
        </h1>
        <p className="mt-1 text-sm text-stone-400">{t('cats', 'subtitle')}</p>
      </div>
      <CatsPlaza cats={cats} breeds={breeds} />
    </div>
  );
}
