import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii, shadows } from '@/core/theme';
import { resolveMediaUrl } from '@/core/mediaUrl';
import type { Note } from '@/core/types';

/**
 * 封面宽高比：用 note id 哈希制造瀑布流错落感。
 * 说明：服务端未存图片宽高，N1 改为真实宽高（首次加载后缓存到本地）。
 */
function coverAspect(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 0.75 + (h % 6) * 0.08; // 0.75 ~ 1.15
}

/** 瀑布流卡片（对齐 Web NoteCard：封面 + 标题 + 作者行 + 🐾猫名/品种标签） */
export function NoteCard({ note }: { note: Note }) {
  const router = useRouter();
  const cover = resolveMediaUrl(note.media?.[0]?.url ?? note.cover_url);
  const isVideo = note.media_type === 'video';
  const authorName = note.author?.nickname || note.author?.username || '';
  const catName = note.cat?.name;
  const breed = note.cat?.breed;
  const aspect = coverAspect(note.id);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/note/${note.id}`)}
    >
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={[styles.cover, { aspectRatio: aspect }]}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder, { aspectRatio: aspect }]} />
      )}

      {isVideo && (
        <View style={styles.videoBadge}>
          <Text style={styles.videoBadgeText}>▶ 视频</Text>
        </View>
      )}

      {note.title ? (
        <Text numberOfLines={2} style={styles.title}>
          {note.title}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Text numberOfLines={1} style={styles.author}>
          {authorName || '猫友'}
        </Text>
        {catName ? (
          <Text numberOfLines={1} style={styles.catTag}>
            🐾 {catName}
            {breed ? ` · ${breed}` : ''}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    overflow: 'hidden',
    marginBottom: 8,
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cover: {
    width: '100%',
    backgroundColor: '#1b1b2a',
  },
  coverPlaceholder: {
    backgroundColor: '#1b1b2a',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  videoBadgeText: {
    color: colors.ink,
    fontSize: 11,
  },
  title: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  footer: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 2,
  },
  author: {
    color: colors.inkMuted,
    fontSize: 12,
  },
  catTag: {
    color: colors.brand[400],
    fontSize: 11,
  },
});
