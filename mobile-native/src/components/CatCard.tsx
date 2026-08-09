import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from './Avatar';
import { colors, radii, shadows } from '@/core/theme';
import type { CatCardData } from '@/features/cats/api';

/** 猫咪广场卡片：头像 + 名字 + 品种 + 热度/笔记数（对齐 Web CatsPlaza 卡片） */
export function CatCard({ cat }: { cat: CatCardData }) {
  const router = useRouter();
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/cat/${cat.id}`)}
    >
      <Avatar src={cat.avatar_url} name={cat.name} size={76} />
      <Text style={styles.name} numberOfLines={1}>
        {cat.name}
      </Text>
      {cat.breed ? (
        <Text style={styles.breed} numberOfLines={1}>
          {cat.breed}
        </Text>
      ) : null}
      <View style={styles.meta}>
        {cat.hot ? <Text style={styles.hot}>🔥 {cat.hot}</Text> : null}
        {typeof cat.note_count === 'number' ? (
          <Text style={styles.noteCount}>{cat.note_count} 笔记</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.85,
  },
  name: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  breed: {
    color: colors.inkMuted,
    fontSize: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  hot: {
    color: colors.warn,
    fontSize: 11,
    fontWeight: '600',
  },
  noteCount: {
    color: colors.inkMuted,
    fontSize: 11,
  },
});
