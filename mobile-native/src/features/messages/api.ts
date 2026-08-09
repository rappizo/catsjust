import { getSupabase } from '@/core/supabase';
import type { AppNotification } from '@/core/types';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface ConversationRow {
  id: string;
  other: {
    id: string;
    username: string;
    nickname: string | null;
    avatar_url: string | null;
  } | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unread: number;
}

export interface UnreadCounts {
  notif: number;
  dm: number;
}

/** 会话列表（含对方资料，最新在前） */
export async function fetchConversations(userId: string): Promise<ConversationRow[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('conversations')
    .select(
      'id, user_a, user_b, last_message_at, last_preview, unread_a, unread_b, created_at, oa:profiles!conversations_user_a_fkey(id, username, nickname, avatar_url), ob:profiles!conversations_user_b_fkey(id, username, nickname, avatar_url)'
    )
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  return ((data ?? []) as any[]).map((c) => {
    const oa = Array.isArray(c.oa) ? c.oa[0] : c.oa;
    const ob = Array.isArray(c.ob) ? c.ob[0] : c.ob;
    const other = c.user_a === userId ? ob : oa;
    return {
      id: c.id,
      other: other ?? null,
      lastMessage: c.last_preview,
      lastMessageAt: c.last_message_at,
      unread: c.user_a === userId ? c.unread_a : c.unread_b,
    };
  });
}

/** 会话消息（正序） */
export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, read, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200);
  return (data ?? []) as ChatMessage[];
}

/** 单个会话（ChatRoom 获取对方信息） */
export async function fetchConversationById(
  conversationId: string,
  userId: string
): Promise<ConversationRow | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('conversations')
    .select(
      'id, user_a, user_b, last_message_at, last_preview, unread_a, unread_b, created_at, oa:profiles!conversations_user_a_fkey(id, username, nickname, avatar_url), ob:profiles!conversations_user_b_fkey(id, username, nickname, avatar_url)'
    )
    .eq('id', conversationId)
    .maybeSingle();
  if (!data) return null;
  const c = data as any;
  const oa = Array.isArray(c.oa) ? c.oa[0] : c.oa;
  const ob = Array.isArray(c.ob) ? c.ob[0] : c.ob;
  const other = c.user_a === userId ? ob : oa;
  return {
    id: c.id,
    other: other ?? null,
    lastMessage: c.last_preview,
    lastMessageAt: c.last_message_at,
    unread: c.user_a === userId ? c.unread_a : c.unread_b,
  };
}

/** 发送消息（敏感词校验，RLS 仅会话双方可发） */
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const text = content.trim();
  if (!text) return { ok: false, error: '消息不能为空' };
  if (text.length > 1000) return { ok: false, error: '消息最多 1000 字' };

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data: hitWord } = await supabase.rpc('has_sensitive_word', { v_text: text });
  if (hitWord) return { ok: false, error: `消息包含敏感词「${hitWord}」，请修改后再发送` };

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, content: text })
    .select('id')
    .single();
  if (error) return { ok: false, error: `发送失败：${error.message}` };
  return { ok: true, messageId: data.id };
}

/** 获取或创建会话（user_a/user_b 由触发器归一化） */
export async function getOrCreateConversation(
  targetUserId: string
): Promise<{ ok: true; conversationId: string } | { ok: false; error: string }> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };
  if (user.id === targetUserId) return { ok: false, error: '不能和自己私信' };

  const { data: target } = await supabase
    .from('profiles')
    .select('id, status')
    .eq('id', targetUserId)
    .maybeSingle();
  if (!target) return { ok: false, error: '用户不存在' };
  if (target.status === 'banned') return { ok: false, error: '该用户不可私信' };

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .or(
      `and(user_a.eq.${user.id},user_b.eq.${targetUserId}),and(user_a.eq.${targetUserId},user_b.eq.${user.id})`
    )
    .maybeSingle();
  if (existing) return { ok: true, conversationId: existing.id };

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_a: user.id, user_b: targetUserId })
    .select('id')
    .single();
  if (error) return { ok: false, error: `创建会话失败：${error.message}` };
  return { ok: true, conversationId: data.id };
}

/** 标记会话已读（RPC 清未读 + 对方消息标记已读） */
export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc('mark_conversation_read', { p_conversation: conversationId });
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .eq('read', false)
    .neq('sender_id', user.id);
}

/** 我的通知列表（含触发者与关联笔记） */
export async function fetchNotifications(): Promise<AppNotification[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('notifications')
    .select(
      '*, actor:profiles!notifications_actor_id_fkey(*), note:notes(id, title, cover_url, media)'
    )
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as AppNotification[];
}

/** 全部通知标记已读 */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);
}

/** 未读数：通知未读 + 私信未读（conversations 绝对值求和） */
export async function fetchUnreadCounts(userId: string): Promise<UnreadCounts> {
  const supabase = getSupabase();
  const [{ count }, { data: convos }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false),
    supabase
      .from('conversations')
      .select('user_a, user_b, unread_a, unread_b')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`),
  ]);
  let dm = 0;
  (convos ?? []).forEach((c: any) => {
    dm += c.user_a === userId ? c.unread_a : c.unread_b;
  });
  return { notif: count ?? 0, dm };
}
