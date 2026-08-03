import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthed } from '@/lib/admin-auth';

/** 公告管理接口（仅后台管理员） */
export async function POST(request: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false, error: '未授权' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const title = String(body?.title ?? '').trim().slice(0, 50);
  const content = String(body?.content ?? '').trim().slice(0, 200);
  if (!title || !content) return NextResponse.json({ ok: false, error: '标题和内容不能为空' });

  const admin = createAdminClient();
  const { error } = await admin.from('announcements').insert({ title, content });
  if (error) return NextResponse.json({ ok: false, error: error.message });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false, error: '未授权' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body?.id ?? '');
  if (!id) return NextResponse.json({ ok: false, error: '缺少 id' });

  const admin = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (typeof body?.active === 'boolean') patch.active = body.active;
  if (typeof body?.title === 'string') patch.title = body.title.trim().slice(0, 50);
  if (typeof body?.content === 'string') patch.content = body.content.trim().slice(0, 200);
  if (!Object.keys(patch).length) return NextResponse.json({ ok: false, error: '无更新内容' });

  const { error } = await admin.from('announcements').update(patch).eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false, error: '未授权' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body?.id ?? '');
  if (!id) return NextResponse.json({ ok: false, error: '缺少 id' });

  const admin = createAdminClient();
  const { error } = await admin.from('announcements').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message });
  return NextResponse.json({ ok: true });
}
