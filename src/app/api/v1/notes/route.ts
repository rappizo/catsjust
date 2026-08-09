import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNoteService, type CreateNoteInput } from '@/lib/noteService';

/**
 * POST /api/v1/notes —— 发布笔记（原生 App 走这里）
 * 认证：Authorization: Bearer <access_token>（原生端无 cookie，用 token 认证）
 * Body: { title, content, media: [{url,type,poster?}], mediaType, coverUrl, catId?, topicId? }
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const {
    data: { user },
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const input: CreateNoteInput = {
    title: typeof b.title === 'string' ? b.title : '',
    content: typeof b.content === 'string' ? b.content : '',
    media: Array.isArray(b.media) ? (b.media as CreateNoteInput['media']) : [],
    mediaType: b.mediaType === 'video' ? 'video' : 'image',
    coverUrl: typeof b.coverUrl === 'string' ? b.coverUrl : '',
    catId: typeof b.catId === 'string' ? b.catId : null,
    topicId: typeof b.topicId === 'string' ? b.topicId : null,
  };

  const admin = createAdminClient();
  const result = await createNoteService({ supabase, admin, userId: user.id, input });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
