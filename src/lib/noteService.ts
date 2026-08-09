/**
 * 笔记业务逻辑（服务端共享层）。
 * 供 Server Actions（notes.ts）与 /api/v1/notes REST 接口复用，保证逻辑单一来源。
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { LIMITS } from '@/lib/constants';
import { aiReviewNote } from '@/lib/ai/review';
import { notifyReviewResult } from '@/lib/notifyReview';
import type { MediaType, NoteMedia } from '@/lib/types';

export type NoteActionResult =
  | { ok: true; message?: string; id?: string; status?: 'pending' | 'published' | 'rejected' }
  | { ok: false; error: string };

export interface CreateNoteInput {
  title: string;
  content: string;
  media: NoteMedia[];
  mediaType: MediaType;
  coverUrl: string;
  catId?: string | null;
  topicId?: string | null;
}

export interface EditNoteInput {
  title: string;
  content: string;
  topicId?: string | null;
}

/** 发布笔记（先审后发，默认 pending；AI 明确通过→发布，明确违规→驳回，无法判断→人工） */
export async function createNoteService(opts: {
  supabase: SupabaseClient;
  admin: SupabaseClient;
  userId: string;
  input: CreateNoteInput;
}): Promise<NoteActionResult> {
  const { supabase, admin, userId, input } = opts;
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title && !content) return { ok: false, error: '标题和正文至少填写一项' };
  if (title.length > LIMITS.TITLE_MAX) return { ok: false, error: `标题最多 ${LIMITS.TITLE_MAX} 字` };
  if (content.length > LIMITS.CONTENT_MAX) {
    return { ok: false, error: `正文最多 ${LIMITS.CONTENT_MAX} 字` };
  }
  if (!input.media.length) return { ok: false, error: '请至少上传一张图片或一个视频' };

  // 敏感词校验
  const [titleHit, contentHit] = await Promise.all([
    title ? supabase.rpc('has_sensitive_word', { v_text: title }) : Promise.resolve({ data: null }),
    content ? supabase.rpc('has_sensitive_word', { v_text: content }) : Promise.resolve({ data: null }),
  ]);
  const hitWord = titleHit.data || contentHit.data;
  if (hitWord) return { ok: false, error: `内容包含敏感词「${hitWord}」，请修改后再发布` };

  const { data, error } = await supabase
    .from('notes')
    .insert({
      author_id: userId,
      title: title || null,
      content: content || null,
      media: input.media,
      cover_url: input.coverUrl,
      media_type: input.mediaType,
      cat_id: input.catId || null,
      topic_id: input.topicId || null,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: `发布失败：${error.message}` };

  // AI 自动审核（gpt-5.5 视觉）
  let finalStatus: 'pending' | 'published' | 'rejected' = 'pending';
  let message = '已提交人工审核';

  const ai = await aiReviewNote({
    title: title || '',
    content: content || '',
    imageUrl: input.coverUrl,
    mediaType: input.mediaType,
  });

  if (ai.verdict === 'approve') {
    await admin.from('notes').update({ status: 'published' }).eq('id', data.id);
    finalStatus = 'published';
    message = '已通过 AI 自动审核，公开展示';
    await notifyReviewResult(data.id, 'published');
  } else if (ai.verdict === 'reject') {
    await admin
      .from('notes')
      .update({ status: 'rejected', reject_reason: ai.reason })
      .eq('id', data.id);
    finalStatus = 'rejected';
    message = `未通过 AI 自动审核：${ai.reason}`;
    await notifyReviewResult(data.id, 'rejected', ai.reason);
  }

  if (ai.verdict !== 'review') {
    await admin.from('review_logs').insert({
      note_id: data.id,
      reviewer_id: null,
      action: ai.verdict,
      reason: ai.reason || 'AI 自动审核',
    });
  }

  return { ok: true, id: data.id, status: finalStatus, message };
}

/** 编辑自己的笔记（重新送审） */
export async function editNoteService(opts: {
  supabase: SupabaseClient;
  userId: string;
  noteId: string;
  input: EditNoteInput;
}): Promise<NoteActionResult> {
  const { supabase, userId, noteId, input } = opts;

  const { data: note } = await supabase
    .from('notes')
    .select('id')
    .eq('id', noteId)
    .eq('author_id', userId)
    .maybeSingle();
  if (!note) return { ok: false, error: '只能编辑自己的笔记' };

  const { error } = await supabase
    .from('notes')
    .update({
      title: input.title.trim(),
      content: input.content.trim(),
      ...(input.topicId !== undefined ? { topic_id: input.topicId } : {}),
      status: 'pending',
      reject_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .eq('author_id', userId);

  if (error) return { ok: false, error: `编辑失败：${error.message}` };
  return { ok: true, message: '已提交编辑，等待审核', id: noteId, status: 'pending' };
}

/** 删除自己的笔记 */
export async function deleteNoteService(opts: {
  supabase: SupabaseClient;
  userId: string;
  noteId: string;
}): Promise<NoteActionResult> {
  const { supabase, userId, noteId } = opts;
  const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('author_id', userId);
  if (error) return { ok: false, error: `删除失败：${error.message}` };
  return { ok: true };
}
