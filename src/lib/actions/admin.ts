'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthed } from '@/lib/admin-auth';
import { aiReviewNote } from '@/lib/ai/review';

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/** 审核笔记：通过 / 驳回 / 下架 */
export async function reviewNote(
  noteId: string,
  action: 'approve' | 'reject' | 'remove',
  reason?: string
): Promise<ActionResult> {
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();

  const status = action === 'approve' ? 'published' : action === 'reject' ? 'rejected' : 'removed';

  const { error } = await admin
    .from('notes')
    .update({
      status,
      reject_reason: action === 'reject' ? reason || null : null,
    })
    .eq('id', noteId);

  if (error) return { ok: false, error: `操作失败：${error.message}` };

  // 记录审核日志
  await admin.from('review_logs').insert({
    note_id: noteId,
    reviewer_id: null,
    action,
    reason: reason || null,
  });

  revalidatePath('/admin/review');
  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true, message: '操作成功' };
}

/** 对待审核笔记执行 AI 重新审核（拿不准推给人工后可重跑） */
export async function aiReviewNow(noteId: string): Promise<ActionResult> {
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();

  const { data: note } = await admin
    .from('notes')
    .select('title, content, cover_url, media_type')
    .eq('id', noteId)
    .maybeSingle();
  if (!note) return { ok: false, error: '笔记不存在' };

  const result = await aiReviewNote({
    title: note.title ?? '',
    content: note.content ?? '',
    imageUrl: note.cover_url,
    mediaType: note.media_type,
  });

  if (result.verdict === 'approve') {
    await admin.from('notes').update({ status: 'published', reject_reason: null }).eq('id', noteId);
  } else if (result.verdict === 'reject') {
    await admin
      .from('notes')
      .update({ status: 'rejected', reject_reason: result.reason })
      .eq('id', noteId);
  }
  // verdict === 'review' → 保持 pending，等待人工

  if (result.verdict !== 'review') {
    await admin.from('review_logs').insert({
      note_id: noteId,
      reviewer_id: null,
      action: result.verdict,
      reason: result.reason || 'AI 自动审核',
    });
  }

  revalidatePath('/admin/review');
  revalidatePath('/admin');
  revalidatePath('/');

  const label =
    result.verdict === 'approve'
      ? 'AI 判定通过，已自动发布'
      : result.verdict === 'reject'
        ? `AI 判定驳回：${result.reason}`
        : 'AI 无法判断，仍需人工审核';
  return { ok: true, message: label };
}

/** 封禁 / 解封用户 */
export async function setUserBanStatus(
  userId: string,
  banned: boolean
): Promise<ActionResult> {
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();

  const { error } = await admin
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

  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();
  const { error } = await admin.from('topics').insert({
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

  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();
  const { error } = await admin
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
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();
  const { error } = await admin
    .from('topics')
    .update({ status: hidden ? 'hidden' : 'active' })
    .eq('id', topicId);

  if (error) return { ok: false, error: `操作失败：${error.message}` };

  revalidatePath('/admin/topics');
  return { ok: true, message: hidden ? '已隐藏' : '已显示' };
}

/** 标记举报工单状态：resolve（已处理）/ reject（驳回举报） */
export async function setReportStatus(
  reportId: string,
  action: 'resolve' | 'reject',
  resolution?: string
): Promise<ActionResult> {
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();

  const { error } = await admin
    .from('reports')
    .update({
      status: action === 'resolve' ? 'resolved' : 'rejected',
      resolution: resolution?.trim() || null,
    })
    .eq('id', reportId);

  if (error) return { ok: false, error: `操作失败：${error.message}` };
  revalidatePath('/admin/reports');
  return { ok: true, message: action === 'resolve' ? '已标记为已处理' : '已驳回举报' };
}

/** 处理举报：删除被举报笔记（永久删除）并关闭工单 */
export async function deleteReportedNote(
  reportId: string,
  noteId: string
): Promise<ActionResult> {
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();

  const { error } = await admin.from('notes').delete().eq('id', noteId);
  if (error) return { ok: false, error: `删除失败：${error.message}` };

  await admin
    .from('reports')
    .update({ status: 'resolved', resolution: '已删除被举报笔记', handled_at: new Date().toISOString() })
    .eq('id', reportId);

  revalidatePath('/admin/reports');
  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true, message: '已删除笔记并关闭工单' };
}

/** 处理举报：删除被举报评论（永久删除）并关闭工单 */
export async function deleteReportedComment(
  reportId: string,
  commentId: string
): Promise<ActionResult> {
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();

  const { error } = await admin.from('comments').delete().eq('id', commentId);
  if (error) return { ok: false, error: `删除失败：${error.message}` };

  await admin
    .from('reports')
    .update({ status: 'resolved', resolution: '已删除被举报评论', handled_at: new Date().toISOString() })
    .eq('id', reportId);

  revalidatePath('/admin/reports');
  return { ok: true, message: '已删除评论并关闭工单' };
}

/** 处理举报：封禁被举报用户并关闭工单 */
export async function banReportedUser(
  reportId: string,
  targetUserId: string
): Promise<ActionResult> {
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();

  const { error } = await admin
    .from('profiles')
    .update({ status: 'banned' })
    .eq('id', targetUserId);
  if (error) return { ok: false, error: `封禁失败：${error.message}` };

  await admin
    .from('reports')
    .update({ status: 'resolved', resolution: '已封禁被举报用户', handled_at: new Date().toISOString() })
    .eq('id', reportId);

  revalidatePath('/admin/reports');
  revalidatePath('/admin/users');
  return { ok: true, message: '已封禁用户并关闭工单' };
}

/** 内容管理：永久删除已发布笔记 */
export async function deleteNotePermanent(noteId: string): Promise<ActionResult> {
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();

  const { error } = await admin.from('notes').delete().eq('id', noteId);
  if (error) return { ok: false, error: `删除失败：${error.message}` };

  revalidatePath('/admin/content');
  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true, message: '已永久删除' };
}

/** 创建品种 */
export async function createBreed(input: {
  name: string;
  sortOrder?: number;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: '请填写品种名称' };
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };

  const admin = createAdminClient();
  const { error } = await admin.from('breeds').insert({
    name,
    sort_order: input.sortOrder ?? 0,
  });
  if (error) return { ok: false, error: `创建失败：${error.message}` };

  revalidatePath('/admin/breeds');
  return { ok: true, message: '已创建' };
}

/** 更新品种 */
export async function updateBreed(
  breedId: string,
  input: { name: string; sortOrder?: number }
): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: '请填写品种名称' };
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('breeds')
    .update({ name, sort_order: input.sortOrder ?? 0 })
    .eq('id', breedId);
  if (error) return { ok: false, error: `更新失败：${error.message}` };

  revalidatePath('/admin/breeds');
  return { ok: true, message: '已更新' };
}

/** 启用 / 停用品种 */
export async function setBreedStatus(
  breedId: string,
  disabled: boolean
): Promise<ActionResult> {
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();

  const { error } = await admin
    .from('breeds')
    .update({ status: disabled ? 'disabled' : 'active' })
    .eq('id', breedId);
  if (error) return { ok: false, error: `操作失败：${error.message}` };

  revalidatePath('/admin/breeds');
  return { ok: true, message: disabled ? '已停用' : '已启用' };
}

/** 删除品种 */
export async function deleteBreed(breedId: string): Promise<ActionResult> {
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();

  const { error } = await admin.from('breeds').delete().eq('id', breedId);
  if (error) return { ok: false, error: `删除失败：${error.message}` };

  revalidatePath('/admin/breeds');
  return { ok: true, message: '已删除' };
}

/** 新增敏感词 */
export async function createSensitiveWord(word: string): Promise<ActionResult> {
  const w = word.trim();
  if (!w) return { ok: false, error: '请填写敏感词' };
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };

  const admin = createAdminClient();
  const { error } = await admin.from('sensitive_words').insert({ word: w });
  if (error) return { ok: false, error: `新增失败：${error.message}` };

  revalidatePath('/admin/sensitive-words');
  return { ok: true, message: '已新增' };
}

/** 启用 / 停用敏感词 */
export async function setSensitiveWordStatus(
  wordId: string,
  disabled: boolean
): Promise<ActionResult> {
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();

  const { error } = await admin
    .from('sensitive_words')
    .update({ status: disabled ? 'disabled' : 'active' })
    .eq('id', wordId);
  if (error) return { ok: false, error: `操作失败：${error.message}` };

  revalidatePath('/admin/sensitive-words');
  return { ok: true, message: disabled ? '已停用' : '已启用' };
}

/** 删除敏感词 */
export async function deleteSensitiveWord(wordId: string): Promise<ActionResult> {
  if (!isAdminAuthed()) return { ok: false, error: '请先登录管理后台' };
  const admin = createAdminClient();

  const { error } = await admin.from('sensitive_words').delete().eq('id', wordId);
  if (error) return { ok: false, error: `删除失败：${error.message}` };

  revalidatePath('/admin/sensitive-words');
  return { ok: true, message: '已删除' };
}
