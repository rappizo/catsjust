import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { HomeTabs } from '@/components/HomeTabs';
import type { CatCardData } from '@/components/CatsPlaza';
import { attachNoteRelations } from '@/lib/noteRelations';
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
  let hotNotes: Note[] = [];
  let followingNotes: Note[] = [];
  let cats: CatCardData[] = [];
  let breeds: string[] = [];
  let isLoggedIn = false;
  let feedError: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data: userResult } = await supabase.auth.getUser();
    const user = userResult.user;
    isLoggedIn = !!user;

    // 发现流：登录用户走个性化推荐 RPC，游客按热度
    if (user) {
      const { data: recNotes } = await supabase.rpc('recommend_notes', {
        p_user: user.id,
        p_limit: PAGE_SIZE,
        p_offset: 0,
      });
      // RPC 返回裸笔记，需批量补齐 author / cat / topic
      hotNotes = await attachNoteRelations(supabase, (recNotes ?? []) as Note[]);
    } else {
      const hotRes = await supabase
        .from('notes')
        .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
        .eq('status', 'published')
        .order('hot_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      hotNotes = (hotRes.data ?? []) as Note[];
      feedError = hotRes.error?.message ?? null;
    }

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

    // 选猫：拉取活跃猫咪 + 品种
    const [catsRes, breedsRes] = await Promise.all([
      supabase
        .from('cats')
        .select(
          'id, name, breed, gender, bio, avatar_url, owner:profiles(id, username, nickname, avatar_url), notes:notes(count)'
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(24),
      supabase
        .from('breeds')
        .select('name')
        .eq('status', 'active')
        .order('sort_order', { ascending: true }),
    ]);
    cats = (catsRes.data ?? []).map((c: any) => {
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
    breeds = (breedsRes.data ?? []).map((b: any) => b.name);
  }

  return (
    <div className="mx-auto max-w-7xl px-2 py-3 sm:px-3 sm:py-4">
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
      <HomeTabs
        hotNotes={hotNotes}
        followingNotes={followingNotes}
        isLoggedIn={isLoggedIn}
        discoverRecommend={isLoggedIn}
        cats={cats}
        breeds={breeds}
      />
    </div>
  );
}
