import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';

/**
 * 首页瀑布流「加载更多」接口（游标分页）
 * GET /api/notes?cursor={"created_at":"...","id":"..."}&limit=12
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 12), 1), 24);
  const cursorRaw = searchParams.get('cursor');

  // 未配置 Supabase 时返回空列表（优雅降级）
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ notes: [] });
  }

  const supabase = createClient();

  let query = supabase
    .from('notes')
    .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (cursorRaw) {
    try {
      const cursor = JSON.parse(cursorRaw);
      const ca = cursor.created_at as string;
      const id = cursor.id as string;
      query = query.or(`and(created_at.lt.${ca}),and(created_at.eq.${ca},id.lt.${id})`);
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
