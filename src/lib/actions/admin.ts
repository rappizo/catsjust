'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/** 审核笔记：通过 / 驳回 / 下架 */
export async function reviewNote(
  noteId: string,
  action: 'approve' | 'reject' | 'remove',
  reason?: string
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const status = action === 'approve' ? 'published' : action === 'reject' ? 'rejected' : 'removed';

  const { error } = await supabase
    .from('notes')
    .update({
      status,
      reject_reason: action === 'reject' ? reason || null : null,
    })
    .eq('id', noteId);

  if (error) return { ok: false, error: `操作失败：${error.message}` };

  // 记录审核日志
  await supabase.from('review_logs').insert({
    note_id: noteId,
    reviewer_id: user.id,
    action,
    reason: reason || null,
  });

  revalidatePath('/admin/review');
  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true, message: '操作成功' };
}

/** 封禁 / 解封用户 */
export async function setUserBanStatus(
  userId: string,
  banned: boolean
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };
  if (user.id === userId) return { ok: false, error: '不能操作自己' };

  const { error } = await supabase
    .from('profiles')
    .update({ status: banned ? 'banned' : 'active' })
    .eq('id', userId);

  if (error) return { ok: false, error: `操作失败：${error.message}` };

  revalidatePath('/admin/users');
  return { ok: true, message: banned ? '已封禁' : '已解封' };
}

/** 创建话题 */
export async function createTopic(input: {
  name: string;
  slug: string;
  description?: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!name) return { ok: false, error: '请填写话题名称' };
  if (!slug) return { ok: false, error: '请填写话题 slug（英文）' };

  const supabase = createClient();
  const { error } = await supabase.from('topics').insert({
    name,
    slug,
    description: input.description?.trim() || null,
  });

  if (error) return { ok: false, error: `创建失败：${error.message}` };

  revalidatePath('/admin/topics');
  return { ok: true, message: '已创建' };
}

/** 更新话题 */
export async function updateTopic(
  topicId: string,
  input: { name: string; description?: string }
): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: '请填写话题名称' };

  const supabase = createClient();
  const { error } = await supabase
    .from('topics')
    .update({ name, description: input.description?.trim() || null })
    .eq('id', topicId);

  if (error) return { ok: false, error: `更新失败：${error.message}` };

  revalidatePath('/admin/topics');
  revalidatePath(`/topics/${topicId}`);
  return { ok: true, message: '已更新' };
}

/** 隐藏 / 显示话题 */
export async function setTopicVisibility(
  topicId: string,
  hidden: boolean
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from('topics')
    .update({ status: hidden ? 'hidden' : 'active' })
    .eq('id', topicId);

  if (error) return { ok: false, error: `操作失败：${error.message}` };

  revalidatePath('/admin/topics');
  return { ok: true, message: hidden ? '已隐藏' : '已显示' };
}
