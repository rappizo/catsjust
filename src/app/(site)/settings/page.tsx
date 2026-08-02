import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { SettingsForm } from '@/components/SettingsForm';
import { InterestsSection } from '@/components/InterestsSection';
import type { InterestInput } from '@/lib/actions/interests';
import { getLocaleFromCookies } from '@/lib/i18n/cookies';
import { getT } from '@/lib/i18n/dictionaries';

export const metadata = {
  title: '个人设置',
};

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) {
    redirect('/login?next=/settings');
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/settings');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, nickname, avatar_url, cover_url, bio, role, status, created_at, language')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) redirect('/login?next=/settings');

  const t = getT(getLocaleFromCookies());

  // 兴趣标签所需数据：话题 / 品种 / 当前已选
  const [{ data: topics }, { data: breeds }, { data: myInterests }] = await Promise.all([
    supabase.from('topics').select('slug, name').eq('status', 'active').order('sort_order', { ascending: true }),
    supabase.from('breeds').select('name').eq('status', 'active').order('sort_order', { ascending: true }),
    supabase.from('profile_interests').select('interest_type, interest_value').eq('user_id', user.id),
  ]);
  const interestTopics = (topics ?? []).map((x: any) => ({ slug: x.slug, name: x.name }));
  const interestBreeds = (breeds ?? []).map((x: any) => x.name);
  const interests: InterestInput[] = (myInterests ?? []).map((x: any) => ({
    type: x.interest_type,
    value: x.interest_value,
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">{t('settings', 'title')}</h1>
        <p className="mt-1 text-sm text-stone-400">{t('settings', 'desc')}</p>
      </div>
      <div className="space-y-6">
        <SettingsForm profile={profile} />
        <InterestsSection topics={interestTopics} breeds={interestBreeds} initial={interests} />
      </div>
    </div>
  );
}
