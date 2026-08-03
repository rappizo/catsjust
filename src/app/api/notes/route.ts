import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { attachNoteRelations } from '@/lib/noteRelations';
import type { Note } from '@/lib/types';

/**
 * 首页瀑布流「加载更多」接口（游标分页）
 * GET /api/notes?cursor={...}&limit=12&feed=following&sort=hot|latest
 * - sort=hot:    按热度分排序（推荐 Tab）
 * - sort=latest: 按时间排序（最新 Tab，默认）
 * - feed=following: 只返回当前登录用户所关注作者的内容
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 12), 1), 24);
  const cursorRaw = searchParams.get('cursor');
  const feed = searchParams.get('feed') || 'all';
  const sort = searchParams.get('sort') || 'latest';

  // 未配置 Supabase 时返回空列表（优雅降级）
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ notes: [] });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 个性化推荐流（登录用户）：调用 recommend_notes RPC，offset 分页；refresh=1 时重新推荐（随机扰动）
  if (feed === 'recommend') {
    if (!user) return NextResponse.json({ notes: [] });
    const isRefresh = searchParams.get('refresh') === '1';
    let offset = 0;
    if (!isRefresh && cursorRaw) {
      try {
        offset = Number(JSON.parse(cursorRaw).offset || 0);
      } catch {
        return NextResponse.json({ error: 'cursor 参数无效' }, { status: 400 });
      }
    }
    const { data, error } = await supabase.rpc('recommend_notes', {
      p_user: user.id,
      p_limit: limit,
      p_offset: offset,
      // 下拉刷新：随机扰动排序，得到「相似但不完全一样」的新推荐
      p_shuffle: isRefresh,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // RPC 返回裸笔记，补齐 author / cat / topic
    const notes = await attachNoteRelations(supabase, (data ?? []) as Note[]);
    return NextResponse.json({ notes });
  }

  const isHot = sort === 'hot';

  let query = supabase
    .from('notes')
    .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
    .eq('status', 'published')
    .order(isHot ? 'hot_score' : 'created_at', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  // 关注流：仅展示所关注作者的内容
  if (feed === 'following') {
    if (!user) return NextResponse.json({ notes: [] });
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .limit(200);
    const ids = (follows ?? []).map((f) => f.following_id);
    if (!ids.length) return NextResponse.json({ notes: [] });
    query = query.in('author_id', ids);
  }

  if (cursorRaw) {
    try {
      const cursor = JSON.parse(cursorRaw);
      if (isHot) {
        const hs = cursor.hot as number;
        const ca = cursor.created_at as string;
        const id = cursor.id as string;
        query = query.or(
          `and(hot_score.lt.${hs}),and(hot_score.eq.${hs},created_at.lt.${ca}),and(hot_score.eq.${hs},created_at.eq.${ca},id.lt.${id})`
        );
      } else {
        const ca = cursor.created_at as string;
        const id = cursor.id as string;
        query = query.or(`and(created_at.lt.${ca}),and(created_at.eq.${ca},id.lt.${id})`);
      }
    } catch {
      return NextResponse.json({ error: 'cursor 参数无效' }, { status: 400 });
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notes: data ?? [] });
}
