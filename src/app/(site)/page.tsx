import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { HomeTabs } from '@/components/HomeTabs';
import { getLocaleFromCookies } from '@/lib/i18n/cookies';
import { getT } from '@/lib/i18n/dictionaries';
import type { Note } from '@/lib/types';

const PAGE_SIZE = 12;

export const metadata = {
  title: '发现猫咪',
  description: '只有猫（CATSJUST）—— 只属于猫咪的内容分享社区',
};

export default async function HomePage() {
  const t = getT(getLocaleFromCookies());
  let notes: Note[] = [];
  let followingNotes: Note[] = [];
  let isLoggedIn = false;
  let feedError: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const [notesResult, userResult] = await Promise.all([
      supabase
        .from('notes')
        .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE),
      supabase.auth.getUser(),
    ]);
    notes = (notesResult.data ?? []) as Note[];
    feedError = notesResult.error?.message ?? null;

    const user = userResult.data.user;
    isLoggedIn = !!user;
    // 登录后拉取关注流首屏
    if (user) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .limit(200);
      const ids = (follows ?? []).map((f) => f.following_id);
      if (ids.length) {
        const { data: fNotes } = await supabase
          .from('notes')
          .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
          .eq('status', 'published')
          .in('author_id', ids)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);
        followingNotes = (fNotes ?? []) as Note[];
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* 顶部横幅 */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-accent-500 to-fuchsia-600 px-6 py-10 text-white shadow-lg shadow-neon-green sm:px-10 sm:py-14">
        <span className="pointer-events-none absolute -left-4 -top-6 select-none text-8xl opacity-20 sm:text-9xl">🐱</span>
        <span className="pointer-events-none absolute right-6 top-4 select-none text-5xl opacity-25 sm:text-6xl">🐾</span>
        <span className="pointer-events-none absolute bottom-2 right-24 hidden select-none text-6xl opacity-20 sm:block">😺</span>
        <div className="relative max-w-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/80">
            {t('hero', 'eyebrow')}
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            {t('hero', 'title')}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/90 sm:text-base">
            {t('hero', 'subtitle')}
          </p>
        </div>
      </section>

      {!isSupabaseConfigured() && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          ⚠️ Supabase 尚未配置。请填写 <code className="font-mono text-xs">.env.local</code>{' '}
          中的密钥后刷新，即可看到真实内容。
        </div>
      )}
      {feedError && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">
          {t('home', 'loadingFail')}{feedError}
        </div>
      )}

      {/* 内容流 */}
      <HomeTabs initialNotes={notes} followingNotes={followingNotes} isLoggedIn={isLoggedIn} />
    </div>
  );
}
