import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/config';

/** 前端运行时错误上报（写入 error_logs，service_role 绕过 RLS） */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false });

  try {
    const body = await request.json();
    const message = String(body?.message ?? '').slice(0, 500);
    if (!message) return NextResponse.json({ ok: true });

    const admin = createAdminClient();
    await admin.from('error_logs').insert({
      message,
      stack: String(body?.stack ?? '').slice(0, 4000) || null,
      url: String(body?.url ?? '').slice(0, 500) || null,
      user_agent: String(body?.userAgent ?? '').slice(0, 300) || null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
