import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { CatCard } from '@/components/CatCard';
import { fetchCatsPlaza } from '@/features/cats/api';
import { colors, radii, spacing } from '@/core/theme';

/** 猫咪广场：品种筛选 + 猫咪网格（热门🔥优先，对齐 Web CatsPlaza） */
export default function CatsScreen() {
  const insets = useSafeAreaInsets();
  const [breed, setBreed] = useState<string>('全部');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cats-plaza'],
    queryFn: fetchCatsPlaza,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const list =
      breed === '全部' ? data.cats : data.cats.filter((c) => c.breed === breed);
    // 热度优先排序（有 hot 的在前），其次笔记数
    return [...list].sort((a, b) => (b.hot ?? 0) - (a.hot ?? 0) || (b.note_count ?? 0) - (a.note_count ?? 0));
  }, [data, breed]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>🐾 猫咪广场</Text>
        <Text style={styles.subtitle}>发现可爱的猫咪们</Text>
      </View>

      {/* 品种筛选 */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.breedRow}
        >
          {['全部', ...(data?.breeds ?? [])].map((b) => {
            const active = breed === b;
            return (
              <Pressable
                key={b}
                onPress={() => setBreed(b)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{b}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : isError || !data ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>猫咪广场加载失败，请稍后重试</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {filtered.map((cat) => (
            <View key={cat.id} style={styles.gridItem}>
              <CatCard cat={cat} />
            </View>
          ))}
          {filtered.length === 0 && (
            <Text style={styles.empty}>该品种还没有猫咪档案</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 13,
    marginTop: 2,
  },
  breedRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: colors.brand[500],
  },
  chipText: {
    color: colors.inkMuted,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.onBrand,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  gridItem: {
    width: '50%',
    padding: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.inkMuted,
    fontSize: 13,
  },
  empty: {
    color: colors.inkMuted,
    fontSize: 13,
    textAlign: 'center',
    width: '100%',
    paddingVertical: spacing.xl,
  },
});
