'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { aiReviewNote } from '@/lib/ai/review';
import { notifyReviewResult } from '@/lib/notifyReview';
import { LIMITS } from '@/lib/constants';
import type { MediaType, NoteMedia } from '@/lib/types';

export type ActionResult =
  | { ok: true; message?: string; id?: string; status?: 'pending' | 'published' | 'rejected' }
  | { ok: false; error: string };

/** 发布笔记（先审后发，默认 pending） */
export async function publishNote(input: {
  title: string;
  content: string;
  media: NoteMedia[];
  mediaType: MediaType;
  coverUrl: string;
  catId?: string | null;
  topicId?: string | null;
}): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const title = input.title.trim();
  const content = input.content.trim();

  if (!title && !content) {
    return { ok: false, error: '标题和正文至少填写一项' };
  }
  if (title.length > LIMITS.TITLE_MAX) {
    return { ok: false, error: `标题最多 ${LIMITS.TITLE_MAX} 字` };
  }
  if (content.length > LIMITS.CONTENT_MAX) {
    return { ok: false, error: `正文最多 ${LIMITS.CONTENT_MAX} 字` };
  }
  if (!input.media.length) {
    return { ok: false, error: '请至少上传一张图片或一个视频' };
  }

  // ---------- 敏感词校验（命中即拦截） ----------
  const [titleHit, contentHit] = await Promise.all([
    title ? supabase.rpc('has_sensitive_word', { v_text: title }) : Promise.resolve({ data: null }),
    content ? supabase.rpc('has_sensitive_word', { v_text: content }) : Promise.resolve({ data: null }),
  ]);
  const hitWord = titleHit.data || contentHit.data;
  if (hitWord) {
    return { ok: false, error: `内容包含敏感词「${hitWord}」，请修改后再发布` };
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({
      author_id: user.id,
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

  // ---------- AI 自动审核（gpt-5.5 视觉） ----------
  // 明确通过 → 自动发布；明确违规 → 自动驳回；无法判断 → 保持 pending 推人工
  const admin = createAdminClient();
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

  revalidatePath('/');
  revalidatePath(`/profile/${user.id}`);
  return { ok: true, id: data.id, status: finalStatus, message };
}

/** 删除自己的笔记 */
export async function deleteNote(noteId: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { error } = await supabase.from('notes').delete().eq('id', noteId);

  if (error) return { ok: false, error: `删除失败：${error.message}` };

  revalidatePath('/');
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}

/** 点赞 / 取消点赞，返回最新状态。无需登录（游客用 guest_id cookie 标识） */
export async function toggleLike(noteId: string): Promise<
  | { ok: true; liked: boolean; count: number }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let liked = false;

  if (user) {
    // 登录用户：按 user_id 点赞
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('note_id', noteId)
      .maybeSingle();

    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, note_id: noteId });
    }
    liked = !existing;
  } else {
    // 游客：读取/生成 guest_id cookie
    const cookieStore = cookies();
    let guestId = cookieStore.get('guest_id')?.value;
    if (!guestId) {
      guestId = crypto.randomUUID();
      cookieStore.set('guest_id', guestId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
    }

    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('guest_id', guestId)
      .eq('note_id', noteId)
      .maybeSingle();

    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({ guest_id: guestId, note_id: noteId });
    }
    liked = !existing;
  }

  const { data: note } = await supabase
    .from('notes')
    .select('like_count')
    .eq('id', noteId)
    .single();

  return {
    ok: true,
    liked,
    count: note?.like_count ?? 0,
  };
}

/** 收藏 / 取消收藏 */
export async function toggleFavorite(noteId: string): Promise<
  | { ok: true; favorited: boolean; count: number }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('note_id', noteId)
    .maybeSingle();

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id);
  } else {
    await supabase.from('favorites').insert({ user_id: user.id, note_id: noteId });
  }

  const { data: note } = await supabase
    .from('notes')
    .select('favorite_count')
    .eq('id', noteId)
    .single();

  return {
    ok: true,
    favorited: !existing,
    count: note?.favorite_count ?? 0,
  };
}

/** 发表评论 */
export async function addComment(
  noteId: string,
  content: string,
  parentId?: string | null
): Promise<
  | { ok: true; comment: { id: string; created_at: string } }
  | { ok: false; error: string }
> {
  const text = content.trim();
  if (!text) return { ok: false, error: '评论内容不能为空' };
  if (text.length > LIMITS.COMMENT_MAX) {
    return { ok: false, error: `评论最多 ${LIMITS.COMMENT_MAX} 字` };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  // ---------- 敏感词校验（命中即拦截） ----------
  const { data: hitWord } = await supabase.rpc('has_sensitive_word', { v_text: text });
  if (hitWord) {
    return { ok: false, error: `评论包含敏感词「${hitWord}」，请修改后再发表` };
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      note_id: noteId,
      user_id: user.id,
      content: text,
      ...(parentId ? { parent_id: parentId } : {}),
    })
    .select('id, created_at')
    .single();

  if (error) return { ok: false, error: `评论失败：${error.message}` };

  revalidatePath(`/notes/${noteId}`);
  return { ok: true, comment: data };
}

/** 评论点赞 / 取消点赞 */
export async function toggleCommentLike(
  commentId: string
): Promise<{ ok: true; liked: boolean; count: number } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data: existing } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('comment_id', commentId)
    .maybeSingle();

  if (existing) {
    await supabase.from('comment_likes').delete().eq('id', existing.id);
  } else {
    await supabase.from('comment_likes').insert({ user_id: user.id, comment_id: commentId });
  }

  const { data: comment } = await supabase
    .from('comments')
    .select('like_count')
    .eq('id', commentId)
    .maybeSingle();

  return { ok: true, liked: !existing, count: comment?.like_count ?? 0 };
}

/** 保存草稿（不入审核，仅作者可见） */
export async function saveDraft(input: {
  title: string;
  content: string;
  media: NoteMedia[];
  mediaType: MediaType;
  coverUrl: string;
  catId?: string | null;
  topicId?: string | null;
}): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data, error } = await supabase
    .from('notes')
    .insert({
      author_id: user.id,
      title: input.title.trim(),
      content: input.content.trim(),
      media: input.media,
      media_type: input.mediaType,
      cover_url: input.coverUrl,
      cat_id: input.catId,
      topic_id: input.topicId,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: `保存草稿失败：${error.message}` };
  return { ok: true, message: '草稿已保存', id: data.id };
}

/** 从草稿发布（送审） */
export async function publishDraft(noteId: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data: draft } = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .eq('author_id', user.id)
    .eq('status', 'draft')
    .maybeSingle();
  if (!draft) return { ok: false, error: '草稿不存在' };

  // 更新为待审 + AI 自动审核
  const { error: upErr } = await supabase
    .from('notes')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('author_id', user.id);
  if (upErr) return { ok: false, error: upErr.message };

  const review = await aiReviewNote({
    title: draft.title ?? '',
    content: draft.content ?? '',
    imageUrl: draft.cover_url,
    mediaType: draft.media_type as 'image' | 'video',
  });
  if (review) {
    if (review.verdict === 'approve') {
      await supabase.from('notes').update({ status: 'published' }).eq('id', noteId);
      revalidatePath(`/notes/${noteId}`);
      return { ok: true, message: '发布成功', id: noteId, status: 'published' };
    }
    if (review.verdict === 'reject') {
      await supabase
        .from('notes')
        .update({ status: 'rejected', reject_reason: review.reason })
        .eq('id', noteId);
      return { ok: true, message: `未通过审核：${review.reason}`, id: noteId, status: 'rejected' };
    }
  }
  return { ok: true, message: '已提交审核，请耐心等待', id: noteId, status: 'pending' };
}

/** 编辑自己的笔记（改后重新送审） */
export async function editNote(
  noteId: string,
  input: { title: string; content: string; topicId?: string | null }
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data: note } = await supabase
    .from('notes')
    .select('id')
    .eq('id', noteId)
    .eq('author_id', user.id)
    .maybeSingle();
  if (!note) return { ok: false, error: '只能编辑自己的笔记' };

  const { error } = await supabase
    .from('notes')
    .update({
      title: input.title.trim(),
      content: input.content.trim(),
      ...(input.topicId !== undefined ? { topic_id: input.topicId } : {}),
      status: 'pending', // 编辑后重新送审
      reject_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .eq('author_id', user.id);

  if (error) return { ok: false, error: `编辑失败：${error.message}` };

  revalidatePath(`/notes/${noteId}`);
  revalidatePath(`/profile/${user.id}`);
  return { ok: true, message: '已提交编辑，等待审核', id: noteId, status: 'pending' };
}
