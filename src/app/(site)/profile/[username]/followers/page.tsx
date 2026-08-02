import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserList, type UserListRow } from '@/components/UserList';
import { isSupabaseConfigured } from '@/lib/config';

export const metadata: Metadata = { title: '粉丝列表' };

export default async function FollowersPage({ params }: { params: { username: string } }) {
  if (!isSupabaseConfigured()) notFound();
  const supabase = createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', params.username)
    .maybeSingle();
  if (!profile) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: follows } = await supabase
    .from('follows')
    .select(
      'follower_id, follower:profiles!follows_follower_id_fkey(id, username, nickname, avatar_url, bio)'
    )
    .eq('following_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(200);

  const users: UserListRow[] = [];
  for (const f of follows ?? []) {
    const u = Array.isArray(f.follower) ? f.follower[0] : f.follower;
    if (u) users.push(u);
  }
  const ids = users.map((u) => u.id);

  // 浏览者是否已关注列表中的用户
  let followingMap: Record<string, boolean> = {};
  if (user && ids.length) {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', ids);
    (data ?? []).forEach((r) => {
      followingMap[r.following_id] = true;
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <UserList
        users={users}
        followingMap={followingMap}
        viewerId={user?.id ?? null}
        title="粉丝"
      />
    </div>
  );
}
