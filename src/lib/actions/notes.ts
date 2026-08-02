'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { LIMITS } from '@/lib/constants';
import type { MediaType, NoteMedia } from '@/lib/types';

export type ActionResult =
  | { ok: true; message?: string; id?: string }
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

  revalidatePath('/');
  revalidatePath(`/profile/${user.id}`);
  return { ok: true, id: data.id };
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
  content: string
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

  const { data, error } = await supabase
    .from('comments')
    .insert({ note_id: noteId, user_id: user.id, content: text })
    .select('id, created_at')
    .single();

  if (error) return { ok: false, error: `评论失败：${error.message}` };

  revalidatePath(`/notes/${noteId}`);
  return { ok: true, comment: data };
}
