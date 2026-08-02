import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { PublishForm } from '@/components/PublishForm';
import { getLocaleFromCookies } from '@/lib/i18n/cookies';
import { getT } from '@/lib/i18n/dictionaries';

export const metadata = {
  title: '发布内容',
};

export default async function PublishPage() {
  const t = getT(getLocaleFromCookies());

  // 未配置 Supabase 时无法发布，先引导登录（登录页无需后端）
  if (!isSupabaseConfigured()) {
    redirect('/login?next=/publish');
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/publish');
  }

  const [{ data: cats }, { data: topics }] = await Promise.all([
    supabase
      .from('cats')
      .select('id, name, breed, gender, birthday, personality_tags, avatar_url')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('topics')
      .select('id, name')
      .eq('status', 'active')
      .order('sort_order', { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">{t('publish', 'title')}</h1>
        <p className="mt-1 text-sm text-stone-400">{t('publish', 'subtitle')}</p>
      </div>

      {/* 审核须知 */}
      <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-400">
          📋 {t('publish', 'rulesTitle')}
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium">
            {t('publish', 'badge')}
          </span>
        </p>
        <ul className="space-y-1 text-xs leading-relaxed text-stone-400">
          <li>· {t('publish', 'rule1')}</li>
          <li>· {t('publish', 'rule2')}</li>
          <li>· {t('publish', 'rule3')}</li>
        </ul>
      </div>

      <PublishForm
        userId={user.id}
        initialCats={cats ?? []}
        topics={topics ?? []}
      />
    </div>
  );
}
