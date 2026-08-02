'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';

export type InterestInput = { type: 'topic' | 'breed'; value: string };

export type InterestsResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const MAX_INTERESTS = 12;

/** 保存兴趣标签（全量替换，最多 12 个） */
export async function saveInterests(interests: InterestInput[]): Promise<InterestsResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: '服务未配置' };

  const unique = interests.filter(
    (i, idx, arr) =>
      arr.findIndex((x) => x.type === i.type && x.value === i.value) === idx
  );
  if (unique.length > MAX_INTERESTS) {
    return { ok: false, error: `最多选择 ${MAX_INTERESTS} 个兴趣` };
  }
  if (unique.some((i) => !i.value || (i.type !== 'topic' && i.type !== 'breed'))) {
    return { ok: false, error: '兴趣参数不合法' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  // 全量替换：先删后插（同一事务内由 RLS 保证只能操作自己的）
  await supabase.from('profile_interests').delete().eq('user_id', user.id);
  if (unique.length) {
    const { error } = await supabase
      .from('profile_interests')
      .insert(unique.map((i) => ({ user_id: user.id, interest_type: i.type, interest_value: i.value })));
    if (error) return { ok: false, error: `保存失败：${error.message}` };
  }

  revalidatePath('/settings');
  revalidatePath('/');
  return { ok: true, message: '兴趣已保存，推荐会更懂你' };
}

/** 标记某条内容「不感兴趣」（推荐流排除） */
export async function addNotInterested(noteId: string): Promise<InterestsResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: '服务未配置' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { error } = await supabase
    .from('not_interested')
    .insert({ user_id: user.id, note_id: noteId });
  if (error) return { ok: false, error: `操作失败：${error.message}` };

  revalidatePath('/');
  revalidatePath(`/notes/${noteId}`);
  return { ok: true, message: '已标记为不感兴趣，将减少此类推荐' };
}
