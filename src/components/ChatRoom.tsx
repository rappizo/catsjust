'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { markConversationRead, sendMessage } from '@/lib/actions/messages';
import { useI18n } from '@/lib/i18n';
import { Avatar } from './Avatar';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface ChatRoomProps {
  conversationId: string;
  currentUserId: string;
  otherUser: { id: string; username: string; nickname: string | null; avatar_url: string | null };
  initialMessages: ChatMessage[];
}

/** 聊天室：气泡 + Realtime 实时收发 + 回车发送 */
export function ChatRoom({
  conversationId,
  currentUserId,
  otherUser,
  initialMessages,
}: ChatRoomProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const otherName = otherUser.nickname || otherUser.username;

  // 打开即标记已读
  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId]);

  // Realtime 订阅新消息 + 已读状态变更
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row]
          );
          // 收到新消息后清空未读
          if (row.sender_id !== currentUserId) {
            markConversationRead(conversationId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          // 对方已读 → 同步已读状态
          setMessages((prev) =>
            prev.map((m) => (m.id === row.id ? { ...m, read: row.read } : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  // 轮询兜底：Realtime 断线/不可用时仍能收到新消息与已读状态
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  useEffect(() => {
    const supabase = createClient();
    const timer = setInterval(async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, read, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (!data) return;
      const prev = messagesRef.current;
      const changed =
        data.length !== prev.length ||
        data.some((m, i) => {
          const p = prev[i];
          return !p || p.id !== m.id || p.read !== m.read || p.content !== m.content;
        });
      if (changed) {
        setMessages(data as ChatMessage[]);
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [conversationId]);

  // 滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await sendMessage(conversationId, text);
      if (res.ok) {
        // 乐观追加本地消息（Realtime 可能已先送达同一条，需去重）
        const optimistic: ChatMessage = {
          id: res.messageId || `tmp-${Date.now()}`,
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: text,
          read: false,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) =>
          prev.some((m) => m.id === optimistic.id) ? prev : [...prev, optimistic]
        );
        setInput('');
      } else {
        setError('error' in res ? res.error : t('messages', 'sendFailed'));
      }
    } catch {
      setError(t('messages', 'sendFailed'));
    }
    setSending(false);
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-card">
      {/* 头部 */}
      <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100"
          aria-label={t('common', 'back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Link href={`/profile/${otherUser.username}`} className="flex min-w-0 items-center gap-2.5">
          <Avatar src={otherUser.avatar_url} alt={otherName} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{otherName}</p>
            <p className="truncate text-xs text-stone-400">@{otherUser.username}</p>
          </div>
        </Link>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 space-y-2 overflow-y-auto bg-stone-50/60 px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-16 text-center text-sm text-stone-400">{t('messages', 'chatEmpty')}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                    mine
                      ? 'rounded-br-md bg-gradient-to-br from-brand-500 to-brand-600 text-[#04281a]'
                      : 'rounded-bl-md border border-stone-200/60 bg-white text-stone-700'
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={cn(
                      'mt-1 text-right text-[10px]',
                      mine ? 'text-[#04281a]/60' : 'text-stone-300'
                    )}
                  >
                    {mine && m.read ? (
                      <span className="text-[#04281a]/80">{t('messages', 'read')}</span>
                    ) : (
                      timeAgo(m.created_at)
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <form onSubmit={handleSend} className="border-t border-stone-100 px-3 py-3">
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder={t('messages', 'chatPlaceholder')}
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-[#04281a] shadow-neon-green transition hover:brightness-110 disabled:opacity-50"
            aria-label={t('messages', 'send')}
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </form>
    </div>
  );
}
