import { getSupabase } from '@/core/supabase';
import type { Cat, CommentItem, Note, Profile } from '@/core/types';

export interface FollowCounts {
  following: number;
  followers: number;
}

export interface ProfileComment extends CommentItem {
  note?: Pick<Note, 'id' | 'title' | 'cover_url' | 'media_type'> | null;
}

/** 按 username 查用户 */
export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = getSupabase();
  const { data } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
  return (data as Profile) ?? null;
}

/** 按 id 查用户 */
export async function fetchProfileById(id: string): Promise<Profile | null> {
  const supabase = getSupabase();
  const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  return (data as Profile) ?? null;
}

export async function fetchIsFollowing(targetUserId: string): Promise<boolean> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle();
  return !!data;
}

export async function fetchFollowCounts(profileId: string): Promise<FollowCounts> {
  const supabase = getSupabase();
  const [{ count: following }, { count: followers }] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profileId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profileId),
  ]);
  return { following: following ?? 0, followers: followers ?? 0 };
}

/** 关注 / 取关（返回最新状态与计数） */
export async function toggleFollow(
  targetUserId: string
): Promise<{ following: boolean; counts: FollowCounts }> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录');
  if (user.id === targetUserId) throw new Error('不能关注自己');

  const { data: existing } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle();

  if (existing) await supabase.from('follows').delete().eq('id', existing.id);
  else await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });

  const counts = await fetchFollowCounts(targetUserId);
  return { following: !existing, counts };
}

/** 我关注的用户列表 */
export async function fetchFollowingList(profileId: string): Promise<Profile[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('follows')
    .select('following:profiles(*)')
    .eq('follower_id', profileId)
    .order('created_at', { ascending: false })
    .limit(100);
  const list = ((data ?? []) as unknown as { following: Profile }[]).map((r) => r.following);
  return list.filter(Boolean);
}

/** 我的粉丝列表 */
export async function fetchFollowersList(profileId: string): Promise<Profile[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('follows')
    .select('follower:profiles(*)')
    .eq('following_id', profileId)
    .order('created_at', { ascending: false })
    .limit(100);
  const list = ((data ?? []) as unknown as { follower: Profile }[]).map((r) => r.follower);
  return list.filter(Boolean);
}

/** 作品（作者视角含非公开；他人只返回已发布） */
export async function fetchProfileWorks(profileId: string, includeAll: boolean): Promise<Note[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('notes')
    .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
    .eq('author_id', profileId)
    .order('created_at', { ascending: false });
  if (!includeAll) query = query.eq('status', 'published');
  const { data } = await query;
  return (data ?? []) as Note[];
}

async function fetchPublishedNotesByIds(ids: string[]): Promise<Note[]> {
  if (!ids.length) return [];
  const supabase = getSupabase();
  const { data } = await supabase
    .from('notes')
    .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
    .eq('status', 'published')
    .in('id', ids);
  return (data ?? []) as Note[];
}

/** 收藏（只展示已发布） */
export async function fetchProfileFavorites(profileId: string): Promise<Note[]> {
  const supabase = getSupabase();
  const { data: favs } = await supabase
    .from('favorites')
    .select('note_id')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(100);
  return fetchPublishedNotesByIds((favs ?? []).map((f) => f.note_id));
}

/** 赞过（只展示已发布） */
export async function fetchProfileLikes(profileId: string): Promise<Note[]> {
  const supabase = getSupabase();
  const { data: likes } = await supabase
    .from('likes')
    .select('note_id')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(100);
  return fetchPublishedNotesByIds((likes ?? []).map((l) => l.note_id));
}

/** TA 的评论（含所属笔记） */
export async function fetchProfileComments(profileId: string): Promise<ProfileComment[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('comments')
    .select('*, note:notes(id, title, cover_url, media_type)')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(100);
  return (data ?? []) as ProfileComment[];
}

/** TA 的猫咪档案 */
export async function fetchProfileCats(profileId: string): Promise<Cat[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('cats')
    .select('*')
    .eq('owner_id', profileId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as Cat[];
}
