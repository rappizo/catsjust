import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { editNoteService, deleteNoteService, type EditNoteInput } from '@/lib/noteService';

/**
 * 原生 App 编辑/删除笔记接口。
 * 认证：Authorization: Bearer <access_token>
 */

async function resolveUser(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  // Bearer token 注入 client：后续写操作以用户身份走 RLS（否则 anon 会被 notes RLS 拦截）
  const supabase = createClient(token || undefined);
  const {
    data: { user },
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  return { supabase, user };
}

/** PATCH /api/v1/notes/:id —— 编辑自己的笔记（重新送审） */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, user } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const input: EditNoteInput = {
    title: typeof b.title === 'string' ? b.title : '',
    content: typeof b.content === 'string' ? b.content : '',
    topicId: typeof b.topicId === 'string' ? b.topicId : undefined,
  };

  const result = await editNoteService({ supabase, userId: user.id, noteId: params.id, input });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

/** DELETE /api/v1/notes/:id —— 删除自己的笔记 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await resolveUser(_request);
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const result = await deleteNoteService({ supabase, userId: user.id, noteId: params.id });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
