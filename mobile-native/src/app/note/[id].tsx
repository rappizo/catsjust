import { useCallback, useEffect, useRef, useState } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { MediaCarousel } from '@/components/MediaCarousel';
import { NoteActions } from '@/components/NoteActions';
import { CommentSection } from '@/components/CommentSection';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchNoteById, fetchNoteInteractions } from '@/features/notes/api';
import { deleteNote } from '@/features/publish/api';
import { resolveMediaUrl } from '@/core/mediaUrl';
import { takePendingCoverTransition, type CoverFrame } from '@/core/coverTransition';
import { timeAgo } from '@/core/utils';
import { colors, radii, spacing } from '@/core/theme';
import type { Note } from '@/core/types';

/**
 * 原生视频播放（expo-video：Android ExoPlayer / iOS AVPlayer 硬解）。
 * 打开即自动播放；封面过渡图（与瀑布流卡片同 URL，缓存命中）在首帧出来后淡出，
 * 实现"无缝打开"——避免播放器初始化黑屏。
 */
function VideoPlayerInline({ uri, poster }: { uri: string; poster?: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
    p.play(); // 打开自动播放
  });
  const [playing, setPlaying] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const sub = player.addListener('playingChange', (e) => {
      if (e.isPlaying) setPlaying(true);
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (playing) {
      Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }
  }, [playing, fade]);

  return (
    <View style={styles.videoWrap}>
      <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />
      {poster ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} pointerEvents="none">
          <Image
            source={{ uri: poster }}
            style={styles.videoPoster}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** 过渡层动画参数：从 from（卡片封面位置）放大/缩小到 to（媒体区位置） */
interface OverlaySpec {
  url: string;
  from: CoverFrame;
  to: CoverFrame;
  onDone: () => void;
}

/**
 * 全屏过渡层：封面图从卡片位置无缝放大到媒体区（打开），或反向缩小（关闭）。
 * 用 translate（中心对齐）+ scale 走 native driver，丝滑无布局抖动。
 */
function CoverOverlay({ spec, onDone }: { spec: OverlaySpec; onDone: () => void }) {
  const { url, from, to } = spec;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const sx = useRef(new Animated.Value(1)).current;
  const sy = useRef(new Animated.Value(1)).current;
  const doneRef = useRef(false);

  const toTx = to.x + to.width / 2 - (from.x + from.width / 2);
  const toTy = to.y + to.height / 2 - (from.y + from.height / 2);
  const toSx = from.width > 0 ? to.width / from.width : 1;
  const toSy = from.height > 0 ? to.height / from.height : 1;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(tx, { toValue: toTx, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ty, { toValue: toTy, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sx, { toValue: toSx, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sy, { toValue: toSy, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished && !doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: from.x,
        top: from.y,
        width: from.width,
        height: from.height,
        borderRadius: radii.sm,
        overflow: 'hidden',
        backgroundColor: '#1b1b2a',
        zIndex: 1000,
        elevation: 1000,
        transform: [{ translateX: tx }, { translateY: ty }, { scaleX: sx }, { scaleY: sy }],
      }}
    >
      <Image
        source={{ uri: url }}
        style={styles.overlayImage}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    </Animated.View>
  );
}

/** 笔记详情：图片轮播 / 视频播放 + 标题内容 + 互动 + 评论（对齐 Web /notes/[id] 图文版） */
export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  // 封面无缝过渡：挂载时一次性取走列表写入的 pending（卡片 rect + 封面 URL）
  const [coverTransition] = useState(() => takePendingCoverTransition());
  const mediaRef = useRef<View>(null);
  const [mediaLayoutReady, setMediaLayoutReady] = useState(false);
  const [overlay, setOverlay] = useState<OverlaySpec | null>(null);
  const closingRef = useRef(false);

  const { data: note, isLoading } = useQuery({
    queryKey: ['note', id],
    queryFn: () => fetchNoteById(id!),
    enabled: !!id,
    // 列表点入时已预填缓存（NoteCard setQueryData）→ 挂载即渲染，无 loading
    placeholderData: () => queryClient.getQueryData(['note', id]),
  });

  // 打开动画：媒体区布局就绪后，从卡片 rect 放大到媒体区 rect
  const startedRef = useRef(false);
  useEffect(() => {
    if (!coverTransition || startedRef.current) return;
    if (!mediaLayoutReady) {
      // 无预填数据时布局会晚到：1 秒内未就绪则放弃动画（避免内容闪现后被覆盖）
      const timeout = setTimeout(() => {
        startedRef.current = true;
      }, 1000);
      return () => clearTimeout(timeout);
    }
    startedRef.current = true;
    const t = setTimeout(() => {
      mediaRef.current?.measureInWindow((x, y, width, height) => {
        if (width <= 0 || height <= 0) return;
        setOverlay({
          url: coverTransition.coverUrl,
          from: coverTransition.from,
          to: { x, y, width, height },
          onDone: () => setOverlay(null),
        });
      });
    }, 120); // 稍等 push 转场，视觉更稳
    return () => clearTimeout(t);
  }, [coverTransition, mediaLayoutReady]);

  // 关闭动画：从当前媒体区 rect 缩回卡片 rect，动画完成后返回列表
  const goBack = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const finish = () => router.back();
    if (!coverTransition || !mediaRef.current) {
      finish();
      return;
    }
    mediaRef.current.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) {
        finish();
        return;
      }
      // 媒体区已滚出屏幕：不做缩回动画，直接返回
      const screenH = Dimensions.get('window').height;
      if (y + height < 0 || y > screenH) {
        finish();
        return;
      }
      setOverlay({
        url: coverTransition.coverUrl,
        from: { x, y, width, height },
        to: coverTransition.from,
        onDone: finish,
      });
    });
  }, [coverTransition, router]);

  // Android 硬件返回同样走关闭动画
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack]);

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
        <Pressable style={styles.backBtn} onPress={goBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
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

      {/* 媒体区（封面无缝过渡的目标：打开放大到这里 / 关闭从这里缩回） */}
      <View
        ref={mediaRef}
        style={styles.media}
        collapsable={false}
        onLayout={() => setMediaLayoutReady(true)}
      >
        {isVideo ? (
          <VideoPlayerInline
            uri={resolveMediaUrl(typed.media?.[0]?.url) ?? ''}
            poster={resolveMediaUrl(typed.cover_url) ?? undefined}
          />
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
  );  {overlay ? <CoverOverlay spec={overlay} onDone={overlay.onDone} /> : null}
    

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
  backBtn: {
    padding: 2,
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
  videoWrap: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoPoster: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayImage: {
    width: '100%',
    height: '100%',
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
