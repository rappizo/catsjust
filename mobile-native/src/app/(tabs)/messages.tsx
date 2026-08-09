import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/features/auth/AuthProvider';
import { useUnread } from '@/features/messages/UnreadProvider';
import {
  fetchConversations,
  fetchNotifications,
  type ConversationRow,
} from '@/features/messages/api';
import { getSupabase } from '@/core/supabase';
import { timeAgo } from '@/core/utils';
import { colors, radii, spacing } from '@/core/theme';
import type { AppNotification } from '@/core/types';

type TabKey = 'dm' | 'comment' | 'like' | 'follow' | 'system';

/** 消息中心：私信 / 评论回复 / 点赞 / 关注 / 系统（对齐 Web MessagesHub） */
export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { notifUnread, dmUnread, refresh } = useUnread();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('dm');

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => fetchConversations(user!.id),
    enabled: !!user,
    refetchInterval: 15_000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: !!user,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    refresh();
  }, [refresh, tab]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'dm', label: '私信', count: dmUnread },
    { key: 'comment', label: '评论回复', count: notifications.filter((n) => n.type === 'comment' && !n.read).length },
    { key: 'like', label: '点赞', count: notifications.filter((n) => n.type === 'like' && !n.read).length },
    { key: 'follow', label: '关注', count: notifications.filter((n) => n.type === 'follow' && !n.read).length },
    { key: 'system', label: '系统', count: notifications.filter((n) => n.type === 'system' && !n.read).length },
  ];

  const filtered =
    tab === 'dm' ? [] : notifications.filter((n) => n.type === tab);

  const markRead = async (n: AppNotification) => {
    if (n.read) return;
    try {
      await getSupabase().from('notifications').update({ read: true }).eq('id', n.id).eq('read', false);
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refresh();
    } catch {
      /* ignore */
    }
  };

  const onNotificationPress = (n: AppNotification) => {
    void markRead(n);
    if (n.note_id && (n.type === 'like' || n.type === 'comment')) {
      router.push(`/note/${n.note_id}`);
    } else if (n.type === 'follow' && n.actor) {
      router.push(`/profile/${n.actor.username}`);
    }
  };

  const renderNotification = ({ item }: { item: AppNotification }) => (
    <Pressable style={styles.notifRow} onPress={() => onNotificationPress(item)}>
      <View style={styles.notifIcon}>
        <Ionicons
          name={iconFor(item.type)}
          size={18}
          color={colorFor(item.type)}
        />
      </View>
      <View style={styles.notifBody}>
        <Text style={styles.notifText} numberOfLines={2}>
          <Text style={styles.notifActor}>
            {item.actor?.nickname || item.actor?.username || '猫友'}
          </Text>{' '}
          {textFor(item)}
        </Text>
        <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>消息</Text>
      </View>

      {/* 5 分组 */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setTab(t.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                {t.count > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{t.count > 99 ? '99+' : t.count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 私信：会话列表 */}
      {tab === 'dm' ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ConversationRowView conv={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>还没有私信，去别人主页发起聊天吧</Text>}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>这里还没有消息</Text>}
        />
      )}
    </View>
  );
}

function ConversationRowView({ conv }: { conv: ConversationRow }) {
  const router = useRouter();
  return (
    <Pressable
      style={({ pressed }) => [styles.convRow, pressed && styles.pressed]}
      onPress={() => router.push(`/messages/${conv.id}`)}
    >
      <Avatar src={conv.other?.avatar_url} name={conv.other?.nickname ?? conv.other?.username} size={48} />
      <View style={styles.convBody}>
        <Text style={styles.convName} numberOfLines={1}>
          {conv.other?.nickname || conv.other?.username || '未知用户'}
        </Text>
        <Text style={styles.convPreview} numberOfLines={1}>
          {conv.lastMessage || '开始聊天吧'}
        </Text>
      </View>
      <View style={styles.convSide}>
        <Text style={styles.convTime}>{timeAgo(conv.lastMessageAt)}</Text>
        {conv.unread > 0 && (
          <View style={styles.convBadge}>
            <Text style={styles.convBadgeText}>{conv.unread > 99 ? '99+' : conv.unread}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function iconFor(type: AppNotification['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'like':
      return 'heart';
    case 'comment':
      return 'chatbubble';
    case 'follow':
      return 'person-add';
    default:
      return 'megaphone';
  }
}

function colorFor(type: AppNotification['type']): string {
  switch (type) {
    case 'like':
      return colors.danger;
    case 'comment':
      return colors.brand[400];
    case 'follow':
      return colors.accent[400];
    default:
      return colors.warn;
  }
}

function textFor(n: AppNotification): string {
  switch (n.type) {
    case 'like':
      return '赞了你的笔记';
    case 'comment':
      return '评论了你的笔记';
    case 'follow':
      return '关注了你';
    default:
      return n.content || '系统通知';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  tabRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.card,
  },
  tabActive: {
    backgroundColor: colors.brand[500],
  },
  tabText: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.onBrand,
  },
  tabBadge: {
    backgroundColor: colors.danger,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  convBody: {
    flex: 1,
    gap: 3,
  },
  convName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  convPreview: {
    color: colors.inkMuted,
    fontSize: 13,
  },
  convSide: {
    alignItems: 'flex-end',
    gap: 5,
  },
  convTime: {
    color: colors.inkMuted,
    fontSize: 11,
  },
  convBadge: {
    backgroundColor: colors.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  convBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBody: {
    flex: 1,
    gap: 3,
  },
  notifText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
  },
  notifActor: {
    fontWeight: '700',
  },
  notifTime: {
    color: colors.inkMuted,
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand[500],
  },
  empty: {
    color: colors.inkMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
