'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, UserCheck, UserPlus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Avatar } from './Avatar';
import { toggleFollow } from '@/lib/actions/social';

export interface UserListRow {
  id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface UserListProps {
  users: UserListRow[];
  /** 是否已关注（与 users 一一对应） */
  followingMap: Record<string, boolean>;
  /** 当前浏览者 id（用于决定是否显示关注按钮） */
  viewerId: string | null;
  /** 标题（关注 / 粉丝） */
  title: string;
}

/** 关注 / 粉丝列表页通用组件 */
export function UserList({ users, followingMap, viewerId, title }: UserListProps) {
  const { t } = useI18n();

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Users className="h-5 w-5 text-brand-500" />
        <h1 className="text-xl font-bold text-ink">{title}</h1>
        <span className="text-sm text-stone-400">({users.length})</span>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200/60 bg-white py-20 text-center shadow-card">
          <Users className="h-10 w-10 text-stone-300" />
          <p className="font-semibold text-stone-600">{t('userList', 'empty')}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => {
            const name = u.nickname || u.username;
            const isSelf = viewerId === u.id;
            return (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-2xl border border-stone-200/60 bg-white px-4 py-3 shadow-card transition hover:border-brand-300"
              >
                <Link href={`/profile/${u.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar src={u.avatar_url} alt={name} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{name}</p>
                    <p className="truncate text-xs text-stone-400">@{u.username}</p>
                    {u.bio && <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{u.bio}</p>}
                  </div>
                </Link>
                {!isSelf && viewerId && (
                  <ListFollowButton
                    targetUserId={u.id}
                    initialFollowing={!!followingMap[u.id]}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** 列表行内关注按钮（轻量版，不显示粉丝数） */
function ListFollowButton({
  targetUserId,
  initialFollowing,
}: {
  targetUserId: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    if (busy) return;
    setBusy(true);
    const res = await toggleFollow(targetUserId);
    if (res.ok) {
      setFollowing(res.following);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className={cn(
        'flex shrink-0 items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:opacity-60',
        following
          ? 'border border-stone-300 bg-white text-stone-500 hover:bg-stone-50'
          : 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-neon-green hover:brightness-110'
      )}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : following ? (
        <UserCheck className="h-3.5 w-3.5" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      {following ? t('profile', 'following') : t('profile', 'follow')}
    </button>
  );
}
