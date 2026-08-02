import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { PublishForm } from '@/components/PublishForm';
import { DraftList } from '@/components/DraftList';
import { getLocaleFromCookies } from '@/lib/i18n/cookies';
import { getT } from '@/lib/i18n/dictionaries';
import type { Note } from '@/lib/types';

export const metadata = {
  title: '发布内容',
};

export default async function PublishPage({
  searchParams,
}: {
  searchParams: { edit?: string };
}) {
  const t = getT(getLocaleFromCookies());
  const editId = searchParams.edit;

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

  const [{ data: cats }, { data: topics }, { data: drafts }] = await Promise.all([
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
    supabase
      .from('notes')
      .select('*')
      .eq('author_id', user.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  // 编辑模式：加载自己的笔记
  let editNote: Note | null = null;
  if (editId) {
    const { data: note } = await supabase
      .from('notes')
      .select('*')
      .eq('id', editId)
      .eq('author_id', user.id)
      .maybeSingle();
    if (note && note.status !== 'published') editNote = note as Note;
  }

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
        editNote={editNote}
      />

      {/* 我的草稿 */}
      <div className="mt-10">
        <h2 className="mb-3 text-lg font-bold text-ink">📝 {t('publish', 'myDrafts')}</h2>
        <DraftList drafts={(drafts ?? []) as Note[]} />
      </div>
    </div>
  );
}
