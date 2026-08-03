import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getRecommendedFollows } from '@/lib/actions/social';
import { OnboardingFollowButton } from '@/components/OnboardingFollowButton';
import { Avatar } from '@/components/Avatar';
import { isSupabaseConfigured } from '@/lib/config';

export const metadata = { title: '发现更多喵友 · 只有猫' };

/** 新用户注册后的关注引导页 */
export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/onboarding');

  const users = await getRecommendedFollows(8);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-[#04281a] shadow-neon-green">
          <Sparkles className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-bold text-ink">欢迎来到只有猫！</h1>
        <p className="mt-2 text-sm text-stone-400">
          关注感兴趣的铲屎官，首页会优先展示他们的猫
        </p>
      </div>

      {users.length > 0 ? (
        <div className="mt-8 space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-2xl border border-stone-200/60 bg-white p-3.5 shadow-card"
            >
              <Link href={`/profile/${u.username}`} className="shrink-0">
                <Avatar src={u.avatar_url} alt={u.nickname} size="md" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/profile/${u.username}`}
                  className="block truncate text-sm font-semibold text-ink hover:text-brand-500"
                >
                  {u.nickname}
                </Link>
                <p className="mt-0.5 truncate text-xs text-stone-400">
                  {u.bio || `${u.notes} 篇内容 · ${u.followers} 位粉丝`}
                </p>
              </div>
              <OnboardingFollowButton targetUserId={u.id} initialFollowing={u.following} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-center text-sm text-stone-400">
          暂时还没有可推荐的喵友，快去发布第一篇内容吧～
        </p>
      )}

      <div className="mt-10 flex items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-2.5 text-sm font-bold text-[#04281a] shadow-neon-green transition hover:brightness-110"
        >
          开始探索
        </Link>
        <Link
          href="/publish"
          className="rounded-full border border-stone-200 px-6 py-2.5 text-sm font-medium text-stone-500 transition hover:border-brand-400 hover:text-brand-500"
        >
          直接发布
        </Link>
      </div>
    </div>
  );
}
