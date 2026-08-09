import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { toggleFavorite, toggleLike } from '@/features/notes/api';
import { formatCount } from '@/core/utils';
import { colors } from '@/core/theme';
import type { Note } from '@/core/types';

interface NoteActionsProps {
  note: Note;
  liked: boolean;
  favorited: boolean;
  onCommentPress?: () => void;
}

/** 互动栏：点赞 / 收藏 / 评论 / 分享（对齐 Web NoteActions） */
export function NoteActions({
  note,
  liked: initialLiked,
  favorited: initialFavorited,
  onCommentPress,
}: NoteActionsProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(note.like_count);
  const [favorited, setFavorited] = useState(initialFavorited);
  const [favCount, setFavCount] = useState(note.favorite_count);
  const [busy, setBusy] = useState(false);

  const onLike = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await toggleLike(note.id);
      setLiked(res.liked);
      setLikeCount(res.count);
      if (res.liked) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* 失败静默 */
    }
    setBusy(false);
  };

  const onFavorite = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await toggleFavorite(note.id);
      setFavorited(res.favorited);
      setFavCount(res.count);
    } catch {
      /* 失败静默 */
    }
    setBusy(false);
  };

  const onShare = () => {
    void Share.share({
      message: `${note.title ?? '猫咪笔记'}｜只有猫 https://www.catsjust.com/notes/${note.id}`,
    });
  };

  return (
    <View style={styles.row}>
      <ActionBtn
        icon={liked ? 'heart' : 'heart-outline'}
        color={liked ? colors.danger : colors.inkMuted}
        label={formatCount(likeCount)}
        onPress={onLike}
      />
      <ActionBtn
        icon={favorited ? 'bookmark' : 'bookmark-outline'}
        color={favorited ? colors.brand[500] : colors.inkMuted}
        label={formatCount(favCount)}
        onPress={onFavorite}
      />
      <ActionBtn
        icon="chatbubble-outline"
        color={colors.inkMuted}
        label={formatCount(note.comment_count)}
        onPress={onCommentPress ?? (() => {})}
      />
      <ActionBtn icon="share-social-outline" color={colors.inkMuted} label="分享" onPress={onShare} />
    </View>
  );
}

function ActionBtn({
  icon,
  color,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.btn} onPress={onPress} hitSlop={8}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  btn: {
    alignItems: 'center',
    gap: 4,
    minWidth: 56,
  },
  label: {
    fontSize: 12,
  },
});
