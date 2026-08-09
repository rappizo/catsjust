import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/components/BackButton';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  fetchConversationById,
  fetchMessages,
  markConversationRead,
  sendMessage,
  type ChatMessage,
} from '@/features/messages/api';
import { getSupabase } from '@/core/supabase';
import { colors, radii, spacing } from '@/core/theme';

/**
 * 聊天详情：气泡 + Realtime 实时收发（乐观去重）+ 8s 轮询兜底 + 已读回执。
 * 对齐 Web ChatRoom。
 */
export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const conversationId = id;
  const userId = user?.id;

  const { data: conv } = useQuery({
    queryKey: ['conversation', conversationId, userId],
    queryFn: () => fetchConversationById(conversationId!, userId!),
    enabled: !!conversationId && !!userId,
  });
  const other = conv?.other;
  const otherName = other?.nickname || other?.username || '私信';

  // 打开即标记已读
  useEffect(() => {
    if (conversationId) void markConversationRead(conversationId);
  }, [conversationId]);

  // 初始加载 + 轮询兜底（对齐 Web 8s）
  useEffect(() => {
    if (!conversationId) return;
    let mounted = true;
    const load = async () => {
      const msgs = await fetchMessages(conversationId);
      if (mounted) setMessages(msgs);
    };
    void load();
    const timer = setInterval(() => void load(), 8000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [conversationId]);

  // Realtime 订阅新消息 + 已读状态变更
  useEffect(() => {
    if (!conversationId) return;
    const supabase = getSupabase();
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
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          // 收到对方新消息后清空未读
          if (row.sender_id !== userId) void markConversationRead(conversationId);
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
          setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, read: row.read } : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || sending || !conversationId || !userId) return;
    setSending(true);
    setError('');
    try {
      const res = await sendMessage(conversationId, text);
      if (res.ok) {
        // 乐观追加（Realtime 可能已先送达同一条，需去重）
        const optimistic: ChatMessage = {
          id: res.messageId || `tmp-${Date.now()}`,
          conversation_id: conversationId,
          sender_id: userId,
          content: text,
          read: false,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) =>
          prev.some((m) => m.id === optimistic.id) ? prev : [...prev, optimistic]
        );
        setInput('');
      } else {
        setError(res.error);
      }
    } catch {
      setError('发送失败，请重试');
    }
    setSending(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + spacing.sm }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* 顶部 */}
      <View style={styles.topBar}>
        <BackButton />
        <Pressable
          style={styles.otherRow}
          onPress={() => other && router.push(`/profile/${other.username}`)}
        >
          <Avatar src={other?.avatar_url} name={other?.nickname ?? other?.username} size={32} />
          <Text style={styles.otherName} numberOfLines={1}>
            {otherName}
          </Text>
        </Pressable>
      </View>

      {/* 消息列表（inverted：最新在底部） */}
      <FlatList
        inverted
        data={[...messages].reverse()}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <Bubble msg={item} mine={item.sender_id === userId} />}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>打个招呼，开始聊天吧~</Text>
          </View>
        }
      />

      {/* 输入栏 */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="发消息…"
          placeholderTextColor={colors.inkMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendDisabled]}
          onPress={() => void onSend()}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color={colors.onBrand} size="small" />
          ) : (
            <Text style={styles.sendText}>发送</Text>
          )}
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </KeyboardAvoidingView>
  );
}

function Bubble({ msg, mine }: { msg: ChatMessage; mine: boolean }) {
  return (
    <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{msg.content}</Text>
      </View>
      {mine && <Text style={styles.readMark}>{msg.read ? '已读' : ''}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  otherName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },
  empty: {
    color: colors.inkMuted,
    fontSize: 13,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMine: {
    backgroundColor: colors.brand[500],
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: colors.onBrand,
  },
  readMark: {
    color: colors.inkMuted,
    fontSize: 10,
    marginLeft: 6,
    marginBottom: 2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    color: colors.ink,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.brand[500],
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: colors.onBrand,
    fontSize: 14,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
});
