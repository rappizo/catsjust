import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeedScreen } from '@/features/feed/FeedScreen';
import type { FeedKind } from '@/features/feed/api';
import { colors, radii, spacing } from '@/core/theme';

const SEGMENTS: { key: FeedKind; label: string }[] = [
  { key: 'recommend', label: '发现' },
  { key: 'following', label: '关注' },
];

/** 首页：顶部分段（发现/关注）+ 瀑布流（对齐「上三下五」导航的首页） */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<FeedKind>('recommend');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {SEGMENTS.map((s) => {
          const active = segment === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSegment(s.key)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FeedScreen kind={segment} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  segment: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  segmentActive: {
    backgroundColor: colors.brand[500],
  },
  segmentText: {
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.onBrand,
  },
});
