import { getSupabase } from '@/core/supabase';
import { FEED_PAGE_SIZE } from '@/core/constants';
import { attachNoteRelations } from './attachRelations';
import type { Note } from '@/core/types';

export type FeedKind = 'recommend' | 'hot' | 'latest' | 'following';

export interface FeedPage {
  notes: Note[];
  /** 下一页 offset */
  offset: number;
  hasMore: boolean;
}

export interface FeedParams {
  kind: FeedKind;
  offset?: number;
  /** 下拉刷新：随机扰动推荐排序 */
  shuffle?: boolean;
  limit?: number;
}

/**
 * 拉取一页信息流。
 * - recommend：登录用户个性化推荐（recommend_notes RPC，返回裸笔记需补关联）
 * - hot：按热度排序（游客/发现流基线）
 * - latest：按时间排序
 * - following：我关注作者的内容
 * 对齐 Web 端 src/app/(site)/page.tsx 与 /api/notes/route.ts。
 */
export async function fetchFeed(params: FeedParams): Promise<FeedPage> {
  const supabase = getSupabase();
  const limit = Math.min(Math.max(params.limit ?? FEED_PAGE_SIZE, 1), 24);
  const offset = params.offset ?? 0;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 个性化推荐流（登录用户）
  if (params.kind === 'recommend') {
    if (!user) return { notes: [], offset, hasMore: false };
    const { data, error } = await supabase.rpc('recommend_notes', {
      p_user: user.id,
      p_limit: limit,
      p_offset: offset,
      p_shuffle: params.shuffle ?? false,
    });
    if (error) throw new Error(error.message);
    const notes = await attachNoteRelations(supabase, (data ?? []) as Note[]);
    return { notes, offset: offset + limit, hasMore: notes.length === limit };
  }

  const isHot = params.kind === 'hot';
  let query = supabase
    .from('notes')
    .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
    .eq('status', 'published')
    .order(isHot ? 'hot_score' : 'created_at', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1);

  // 关注流：仅展示所关注作者的内容
  if (params.kind === 'following') {
    if (!user) return { notes: [], offset, hasMore: false };
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .limit(200);
    const ids = (follows ?? []).map((f) => f.following_id);
    if (!ids.length) return { notes: [], offset, hasMore: false };
    query = query.in('author_id', ids);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const notes = (data ?? []) as Note[];
  return { notes, offset: offset + limit, hasMore: notes.length === limit };
}
