import { useState, type ReactNode } from 'react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from './Avatar';
import { addComment, fetchComments } from '@/features/notes/api';
import { timeAgo } from '@/core/utils';
import { colors, radii, spacing } from '@/core/theme';
import type { CommentItem } from '@/core/types';

interface CommentSectionProps {
  noteId: string;
  currentUser: { id: string; nickname: string; avatar_url: string | null } | null;
  /** 插在评论列表顶部的自定义内容（笔记详情页：图片+标题+内容+互动） */
  renderHeader?: () => ReactNode;
  /** 整页模式：撑满父容器（详情页用 FlatList 承载全部内容），默认 false（独立卡片） */
  asPage?: boolean;
}

/**
 * 评论区：一级评论 + 楼中楼回复 + 底部输入框。
 * 对齐 Web CommentSection（topLevel 过滤 + parent_id 分组）。
 */
export function CommentSection({ noteId, currentUser, renderHeader, asPage = false }: CommentSectionProps) {
  const queryClient = useQueryClient();
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', noteId],
    queryFn: () => fetchComments(noteId),
    staleTime: 15_000,
  });

  const topLevel = comments.filter((c) => !c.parent_id);

  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const onSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError('');
    try {
      await addComment(noteId, content, replyTo?.id ?? null);
      setText('');
      setReplyTo(null);
      await queryClient.invalidateQueries({ queryKey: ['comments', noteId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : '评论失败');
    }
    setSending(false);
  };

  const renderReply = (reply: CommentItem) => (
    <View key={reply.id} style={styles.replyRow}>
      <Avatar src={reply.author?.avatar_url} name={reply.author?.nickname ?? reply.author?.username} size={26} />
      <View style={styles.replyBody}>
        <Text style={styles.replyName}>
          {reply.author?.nickname || reply.author?.username || '猫友'}
        </Text>
        <Text style={styles.replyContent}>{reply.content}</Text>
        <Text style={styles.replyTime}>{timeAgo(reply.created_at)}</Text>
      </View>
    </View>
  );

  const list = (
    <FlatList
      data={topLevel}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          {renderHeader ? renderHeader() : null}
          <Text style={styles.header}>评论 {comments.length}</Text>
        </>
      }
      renderItem={({ item }) => {
          const replies = comments.filter((c) => c.parent_id === item.id);
          return (
            <View style={styles.commentRow}>
              <Avatar
                src={item.author?.avatar_url}
                name={item.author?.nickname ?? item.author?.username}
                size={34}
              />
              <View style={styles.commentBody}>
                <Text style={styles.name}>
                  {item.author?.nickname || item.author?.username || '猫友'}
                </Text>
                <Text style={styles.content}>{item.content}</Text>
                <View style={styles.meta}>
                  <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                  <Pressable
                    onPress={() => {
                      if (!currentUser) return;
                      setReplyTo(item);
                    }}
                    hitSlop={6}
                  >
                    <Text style={styles.replyBtn}>回复</Text>
                  </Pressable>
                </View>
                {replies.length > 0 && <View style={styles.replies}>{replies.map(renderReply)}</View>}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.brand[500]} style={{ marginTop: 20 }} />
          ) : (
            <Text style={styles.empty}>还没有评论，来抢沙发~</Text>
          )
        }
      />
    );

    const inputBar = (
      <View style={styles.inputBar}>
        {replyTo && (
          <View style={styles.replying}>
            <Text style={styles.replyingText}>
              回复 @{replyTo.author?.nickname || replyTo.author?.username}
            </Text>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={6}>
              <Text style={styles.cancelReply}>取消</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={currentUser ? '说点什么…' : '登录后参与评论'}
            placeholderTextColor={colors.inkMuted}
            value={text}
            onChangeText={setText}
            editable={!!currentUser}
            multiline
          />
          <Pressable
            style={[styles.sendBtn, (!text.trim() || !currentUser) && styles.sendDisabled]}
            onPress={() => void onSend()}
            disabled={!text.trim() || !currentUser || sending}
          >
            {sending ? (
              <ActivityIndicator color={colors.onBrand} size="small" />
            ) : (
              <Text style={styles.sendText}>发送</Text>
            )}
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );

    if (asPage) {
      return (
        <View style={styles.container}>
          {list}
          {inputBar}
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
        style={styles.container}
      >
        {list}
        {inputBar}
      </KeyboardAvoidingView>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: spacing.md,
  },
  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  commentBody: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  name: {
    color: colors.inkMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  content: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 6,
  },
  time: {
    color: colors.inkMuted,
    fontSize: 11,
  },
  replyBtn: {
    color: colors.brand[400],
    fontSize: 12,
  },
  replies: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  replyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  replyBody: {
    flex: 1,
  },
  replyName: {
    color: colors.inkMuted,
    fontSize: 11,
  },
  replyContent: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
  },
  replyTime: {
    color: colors.inkMuted,
    fontSize: 10,
    marginTop: 2,
  },
  empty: {
    color: colors.inkMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  replying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  replyingText: {
    color: colors.brand[400],
    fontSize: 12,
  },
  cancelReply: {
    color: colors.inkMuted,
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    color: colors.ink,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.brand[500],
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
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
  },
});
