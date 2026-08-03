'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserCheck, UserPlus } from 'lucide-react';
import { toggleFollow } from '@/lib/actions/social';

/** 引导页轻量关注按钮（不显示计数） */
export function OnboardingFollowButton({
  targetUserId,
  initialFollowing,
}: {
  targetUserId: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    if (busy) return;
    setBusy(true);
    const res = await toggleFollow(targetUserId);
    if (res.ok) setFollowing(res.following);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className={
        following
          ? 'flex shrink-0 items-center gap-1 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-500 transition hover:border-stone-300'
          : 'flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-3 py-1.5 text-xs font-semibold text-[#04281a] shadow-neon-green transition hover:brightness-110'
      }
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : following ? (
        <UserCheck className="h-3.5 w-3.5" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      {following ? '已关注' : '关注'}
    </button>
  );
}
