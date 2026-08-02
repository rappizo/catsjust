import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { HomeTabs } from '@/components/HomeTabs';
import type { Note } from '@/lib/types';

const PAGE_SIZE = 12;

export const metadata = {
  title: '发现猫咪',
  description: '只有猫（CATSJUST）—— 只属于猫咪的内容分享社区',
};

export default async function HomePage() {
  let notes: Note[] = [];
  let feedError: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notes')
      .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    notes = (data ?? []) as Note[];
    feedError = error?.message ?? null;
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
            CATSJUST
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            只属于猫咪的分享社区
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/90 sm:text-base">
            晒出你的猫，记录每一只毛孩子的日常。
            纯展示 · 无商业 · 垂直专业。
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
          内容加载失败：{feedError}
        </div>
      )}

      {/* 内容流 */}
      <HomeTabs initialNotes={notes} />
    </div>
  );
}
