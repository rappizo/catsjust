'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { toggleFollow } from '@/lib/actions/social';
import type { FollowCounts } from '@/lib/types';

interface FollowButtonProps {
  targetUserId: string;
  targetUsername: string;
  initialFollowing: boolean;
  initialCounts: FollowCounts;
}

/** 关注 / 取关按钮（用于他人主页） */
export function FollowButton({
  targetUserId,
  targetUsername,
  initialFollowing,
  initialCounts,
}: FollowButtonProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [following, setFollowing] = useState(initialFollowing);
  const [counts, setCounts] = useState(initialCounts);
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    if (busy) return;
    setBusy(true);
    const res = await toggleFollow(targetUserId);
    if (res.ok) {
      setFollowing(res.following);
      setCounts(res.counts);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition ${
        following
          ? 'border border-stone-300 bg-white text-stone-600 hover:bg-stone-50'
          : 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-neon-green hover:brightness-110'
      }`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : following ? (
        <UserCheck className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {following ? t('profile', 'following') : t('profile', 'follow')}
      <span className="ml-1 text-xs opacity-80">
        {counts.followers}
      </span>
    </button>
  );
}
