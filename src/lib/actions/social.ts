'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import type { FollowCounts, Note } from '@/lib/types';

export type SocialResult =
  | { ok: true; following: boolean; counts: FollowCounts }
  | { ok: false; error: string };

/** 关注 / 取关（返回最新状态与计数） */
export async function toggleFollow(targetUserId: string): Promise<SocialResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: '服务未配置' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };
  if (user.id === targetUserId) return { ok: false, error: '不能关注自己' };

  // 目标用户存在且未被封禁
  const { data: target } = await supabase
    .from('profiles')
    .select('id, username, status')
    .eq('id', targetUserId)
    .maybeSingle();
  if (!target) return { ok: false, error: '用户不存在' };
  if (target.status === 'banned') return { ok: false, error: '该用户不可关注' };

  // 是否已关注
  const { data: existing } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from('follows').insert({
      follower_id: user.id,
      following_id: targetUserId,
    });
    if (error) return { ok: false, error: error.message };
  }

  const counts = await getFollowCounts(targetUserId);
  revalidatePath(`/profile/${target.username}`);
  return { ok: true, following: !existing, counts };
}

/** 是否已关注 */
export async function isFollowing(followerId: string, targetId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !followerId) return false;
  const supabase = createClient();
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', targetId)
    .maybeSingle();
  return !!data;
}

/** 关注数 / 粉丝数 */
export async function getFollowCounts(targetId: string): Promise<FollowCounts> {
  if (!isSupabaseConfigured()) return { following: 0, followers: 0 };
  const supabase = createClient();
  const [{ count: following }, { count: followers }] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', targetId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', targetId),
  ]);
  return { following: following ?? 0, followers: followers ?? 0 };
}

/** 我关注的人的已发布笔记（关注流，分页用） */
export async function getFollowingFeed(
  currentUserId: string,
  opts: { cursor?: string | null; limit?: number } = {}
): Promise<Note[]> {
  if (!isSupabaseConfigured() || !currentUserId) return [];
  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 24);
  const supabase = createClient();

  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUserId)
    .limit(200);
  const ids = (follows ?? []).map((f) => f.following_id);
  if (!ids.length) return [];

  let query = supabase
    .from('notes')
    .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
    .eq('status', 'published')
    .in('author_id', ids)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (opts.cursor) {
    try {
      const c = JSON.parse(opts.cursor);
      query = query.or(`and(created_at.lt.${c.created_at}),and(created_at.eq.${c.created_at},id.lt.${c.id})`);
    } catch {
      // 忽略无效游标
    }
  }

  const { data } = await query;
  return (data ?? []) as Note[];
}
