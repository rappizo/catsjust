import { getSupabase } from '@/core/supabase';
import { LIMITS } from '@/core/constants';
import type { CommentItem, Note } from '@/core/types';

/** 笔记详情（含 author/cat/topic 关联） */
export async function fetchNoteById(id: string): Promise<Note | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('notes')
    .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
    .eq('id', id)
    .maybeSingle();
  return (data as Note) ?? null;
}

/** 当前用户对笔记的点赞/收藏状态 */
export async function fetchNoteInteractions(
  noteId: string
): Promise<{ liked: boolean; favorited: boolean }> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { liked: false, favorited: false };
  const [{ data: likeRow }, { data: favRow }] = await Promise.all([
    supabase.from('likes').select('id').eq('user_id', user.id).eq('note_id', noteId).maybeSingle(),
    supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('note_id', noteId)
      .maybeSingle(),
  ]);
  return { liked: !!likeRow, favorited: !!favRow };
}

/** 点赞 / 取消点赞（like_count 由数据库触发器维护） */
export async function toggleLike(noteId: string): Promise<{ liked: boolean; count: number }> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录');

  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('note_id', noteId)
    .maybeSingle();
  if (existing) await supabase.from('likes').delete().eq('id', existing.id);
  else await supabase.from('likes').insert({ user_id: user.id, note_id: noteId });

  const { data: note } = await supabase
    .from('notes')
    .select('like_count')
    .eq('id', noteId)
    .single();
  return { liked: !existing, count: note?.like_count ?? 0 };
}

/** 收藏 / 取消收藏 */
export async function toggleFavorite(
  noteId: string
): Promise<{ favorited: boolean; count: number }> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录');

  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('note_id', noteId)
    .maybeSingle();
  if (existing) await supabase.from('favorites').delete().eq('id', existing.id);
  else await supabase.from('favorites').insert({ user_id: user.id, note_id: noteId });

  const { data: note } = await supabase
    .from('notes')
    .select('favorite_count')
    .eq('id', noteId)
    .single();
  return { favorited: !existing, count: note?.favorite_count ?? 0 };
}

/** 评论列表（含作者，新在前） */
export async function fetchComments(noteId: string): Promise<CommentItem[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('comments')
    .select('*, author:profiles(*)')
    .eq('note_id', noteId)
    .order('created_at', { ascending: false })
    .limit(100);
  return (data ?? []) as CommentItem[];
}

/** 发表评论（敏感词校验 + 楼中楼 parent_id） */
export async function addComment(
  noteId: string,
  content: string,
  parentId?: string | null
): Promise<CommentItem> {
  const text = content.trim();
  if (!text) throw new Error('评论内容不能为空');
  if (text.length > LIMITS.COMMENT_MAX) throw new Error(`评论最多 ${LIMITS.COMMENT_MAX} 字`);

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录');

  // 敏感词校验（RPC，与 Web 一致）
  const { data: hitWord } = await supabase.rpc('has_sensitive_word', { v_text: text });
  if (hitWord) throw new Error(`评论包含敏感词「${hitWord}」，请修改后再发表`);

  const { data, error } = await supabase
    .from('comments')
    .insert({
      note_id: noteId,
      user_id: user.id,
      content: text,
      ...(parentId ? { parent_id: parentId } : {}),
    })
    .select('*, author:profiles(*)')
    .single();
  if (error) throw new Error(`评论失败：${error.message}`);
  return data as CommentItem;
}
