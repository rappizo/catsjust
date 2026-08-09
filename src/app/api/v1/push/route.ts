import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * POST /api/v1/push —— 推送网关
 * 由 Supabase 数据库触发器（pg_net）调用，转发到 Expo Push Service。
 * 认证：X-Push-Secret header（与 env PUSH_SECRET 一致）
 * Body: { userId, title?, body?, data? }
 */
export async function POST(request: Request) {
  const secret = request.headers.get('x-push-secret');
  if (secret !== process.env.PUSH_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 401 });
  }

  let body: { userId?: string; title?: string; body?: string; data?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad body' }, { status: 400 });
  }
  if (!body.userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  // 查该用户的所有推送 token
  const admin = createAdminClient();
  const { data: tokens } = await admin
    .from('push_tokens')
    .select('expo_token')
    .eq('user_id', body.userId);
  if (!tokens?.length) return NextResponse.json({ ok: true, skipped: true });

  const messages = tokens.map((t) => ({
    to: t.expo_token,
    title: body.title ?? '只有猫',
    body: body.body ?? '',
    data: body.data ?? {},
    sound: 'default' as const,
  }));

  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch {
    // 推送失败不影响主流程
  }
  return NextResponse.json({ ok: true, sent: messages.length });
}
