'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';

export type MessageResult =
  | { ok: true; message?: string; conversationId?: string; messageId?: string }
  | { ok: false; error: string };

/** 获取或创建与目标用户的会话（返回会话 id） */
export async function getOrCreateConversation(
  targetUserId: string
): Promise<MessageResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: '服务未配置' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };
  if (user.id === targetUserId) return { ok: false, error: '不能和自己私信' };

  // 目标用户存在且未被封禁
  const { data: target } = await supabase
    .from('profiles')
    .select('id, status')
    .eq('id', targetUserId)
    .maybeSingle();
  if (!target) return { ok: false, error: '用户不存在' };
  if (target.status === 'banned') return { ok: false, error: '该用户不可私信' };

  // 查找已有会话（归一化由触发器处理，这里双向查询）
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .or(`and(user_a.eq.${user.id},user_b.eq.${targetUserId}),and(user_a.eq.${targetUserId},user_b.eq.${user.id})`)
    .maybeSingle();
  if (existing) return { ok: true, conversationId: existing.id };

  // 创建新会话（user_a/user_b 顺序由 trg_conversations_normalize 归一化）
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_a: user.id, user_b: targetUserId })
    .select('id')
    .single();
  if (error) return { ok: false, error: `创建会话失败：${error.message}` };

  return { ok: true, conversationId: data.id };
}

/** 发送私信消息（含敏感词校验，RLS 确保仅会话双方可发） */
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<MessageResult> {
  const text = content.trim();
  if (!text) return { ok: false, error: '消息不能为空' };
  if (text.length > 1000) return { ok: false, error: '消息最多 1000 字' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  // 敏感词校验（复用发布/评论同一函数）
  const { data: hitWord } = await supabase.rpc('has_sensitive_word', { v_text: text });
  if (hitWord) {
    return { ok: false, error: `消息包含敏感词「${hitWord}」，请修改后再发送` };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: text,
    })
    .select('id')
    .single();
  if (error) {
    console.error('[sendMessage] 插入失败:', error.message, error.details, error.hint);
    return { ok: false, error: `发送失败：${error.message}` };
  }

  revalidatePath(`/messages/conversations/${conversationId}`);
  revalidatePath('/messages');
  return { ok: true, messageId: data.id };
}

/** 标记会话已读：清空当前用户未读数 + 标记对方消息已读 */
export async function markConversationRead(conversationId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc('mark_conversation_read', { p_conversation: conversationId });
  // 对方发来的消息标记为已读（已读回执）
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .eq('read', false)
    .neq('sender_id', user.id);
}
