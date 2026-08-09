import { useVideoPlayer, VideoView } from 'expo-video';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '@/components/BackButton';
import { Avatar } from '@/components/Avatar';
import { MediaCarousel } from '@/components/MediaCarousel';
import { NoteActions } from '@/components/NoteActions';
import { CommentSection } from '@/components/CommentSection';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchNoteById, fetchNoteInteractions } from '@/features/notes/api';
import { deleteNote } from '@/features/publish/api';
import { resolveMediaUrl } from '@/core/mediaUrl';
import { timeAgo } from '@/core/utils';
import { colors, radii, spacing } from '@/core/theme';
import type { Note } from '@/core/types';

/** 原生视频播放（expo-video：Android ExoPlayer / iOS AVPlayer 硬解） */
function VideoPlayerInline({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />
  );
}

/** 笔记详情：图片轮播 / 视频播放 + 标题内容 + 互动 + 评论（对齐 Web /notes/[id] 图文版） */
export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const { data: note, isLoading } = useQuery({
    queryKey: ['note', id],
    queryFn: () => fetchNoteById(id!),
    enabled: !!id,
  });

  const { data: interactions } = useQuery({
    queryKey: ['note-interactions', id, user?.id ?? 'guest'],
    queryFn: () => fetchNoteInteractions(id!),
    enabled: !!id,
  });

  const currentUser =
    user && profile
      ? {
          id: user.id,
          nickname: profile.nickname || profile.username,
          avatar_url: profile.avatar_url,
        }
      : null;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }
  if (!note) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>笔记不存在或已删除</Text>
      </View>
    );
  }

  const typed = note as Note;
  const isVideo = typed.media_type === 'video';
  const isOwner = user?.id === typed.author_id;

  const onDelete = () => {
    Alert.alert('删除笔记', '确定删除这篇笔记吗？删除后不可恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteNote(typed.id);
              await queryClient.invalidateQueries({ queryKey: ['feed'] });
              router.back();
            } catch (e) {
              Alert.alert('删除失败', e instanceof Error ? e.message : '请稍后重试');
            }
          })();
        },
      },
    ]);
  };

  const renderHeader = () => (
    <View>
      {/* 顶部返回 + 作者 */}
      <View style={styles.topBar}>
        <BackButton />
        <Pressable
          style={styles.authorRow}
          onPress={() => router.push(`/profile/${typed.author?.username ?? ''}`)}
        >
          <Avatar
            src={typed.author?.avatar_url}
            name={typed.author?.nickname ?? typed.author?.username}
            size={36}
          />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName} numberOfLines={1}>
              {typed.author?.nickname || typed.author?.username || '猫友'}
            </Text>
            <Text style={styles.time}>{timeAgo(typed.created_at)}</Text>
          </View>
        </Pressable>
        {typed.cat && (
          <Pressable style={styles.catBadge} onPress={() => router.push(`/cat/${typed.cat!.id}`)}>
            <Text style={styles.catBadgeText}>🐾 {typed.cat.name}</Text>
          </Pressable>
        )}
      </View>

      {/* 媒体区 */}
      <View style={styles.media}>
        {isVideo ? (
          <VideoPlayerInline uri={resolveMediaUrl(typed.media?.[0]?.url) ?? ''} />
        ) : (
          <MediaCarousel media={typed.media} />
        )}
      </View>

      {/* 标题 + 内容 */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          {typed.title ? <Text style={styles.title}>{typed.title}</Text> : null}
          {isOwner && (
            <View style={styles.ownerActions}>
              <Pressable
                style={styles.ownerBtn}
                onPress={() => router.push(`/publish?edit=${typed.id}`)}
                hitSlop={6}
              >
                <Ionicons name="create-outline" size={18} color={colors.brand[400]} />
              </Pressable>
              <Pressable style={styles.ownerBtn} onPress={onDelete} hitSlop={6}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          )}
        </View>
        {typed.content ? <Text style={styles.content}>{typed.content}</Text> : null}

        {/* 关联：猫咪 / 话题 / 品种 */}
        {(typed.cat || typed.topic) && (
          <View style={styles.tags}>
            {typed.cat && (
              <Pressable style={styles.tagCat} onPress={() => router.push(`/cat/${typed.cat!.id}`)}>
                <Text style={styles.tagCatText}>🐾 {typed.cat.name}</Text>
              </Pressable>
            )}
            {typed.topic && (
              <Pressable
                style={styles.tagTopic}
                onPress={() =>
                  router.push(`/search?q=${encodeURIComponent(`#${typed.topic?.name ?? ''}`)}`)
                }
              >
                <Text style={styles.tagTopicText}># {typed.topic.name}</Text>
              </Pressable>
            )}
            {typed.cat?.breed ? (
              <Pressable
                style={styles.tagTopic}
                onPress={() => router.push(`/search?q=${encodeURIComponent(typed.cat!.breed!)}`)}
              >
                <Text style={styles.tagTopicText}>#{typed.cat.breed}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      <NoteActions
        note={typed}
        liked={interactions?.liked ?? false}
        favorited={interactions?.favorited ?? false}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <CommentSection noteId={typed.id} currentUser={currentUser} renderHeader={renderHeader} asPage />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 52,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.inkMuted,
    fontSize: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  time: {
    color: colors.inkMuted,
    fontSize: 11,
  },
  catBadge: {
    backgroundColor: colors.brand[50],
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  catBadgeText: {
    color: colors.brand[400],
    fontSize: 11,
    fontWeight: '600',
  },
  media: {
    marginTop: spacing.xs,
  },
  video: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 26,
    flex: 1,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ownerBtn: {
    padding: 4,
  },
  content: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagCat: {
    backgroundColor: colors.brand[50],
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagCatText: {
    color: colors.brand[400],
    fontSize: 12,
    fontWeight: '600',
  },
  tagTopic: {
    backgroundColor: colors.card,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagTopicText: {
    color: colors.inkMuted,
    fontSize: 12,
  },
});
