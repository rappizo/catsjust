import { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchFeed, type FeedKind } from './api';
import { NoteCard } from '@/components/NoteCard';
import { colors, radii, spacing } from '@/core/theme';

interface FeedScreenProps {
  kind: FeedKind;
}

/** 瀑布流双列行：每行两个卡片（flash-list 2.x 已移除 MasonryFlashList） */
interface FeedRow {
  left?: FeedNote;
  right?: FeedNote;
}

type FeedNote = Awaited<ReturnType<typeof fetchFeed>>['notes'][number];

function pairNotes(notes: FeedNote[]): FeedRow[] {
  const rows: FeedRow[] = [];
  for (let i = 0; i < notes.length; i += 2) {
    rows.push({ left: notes[i], right: notes[i + 1] });
  }
  return rows;
}
export function FeedScreen({ kind }: FeedScreenProps) {
  const { user } = useAuth();
  // 未登录时推荐流降级为热度流
  const effectiveKind: FeedKind = kind === 'recommend' && !user ? 'hot' : kind;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed', effectiveKind, user?.id ?? 'guest'],
    queryFn: ({ pageParam }) => fetchFeed({ kind: effectiveKind, offset: pageParam as number }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.offset : undefined),
    initialPageParam: 0,
    staleTime: 30_000,
  });

  const notes = data?.pages.flatMap((p) => p.notes) ?? [];
  const rows = pairNotes(notes);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand[500]} />
        <Text style={styles.hint}>加载中…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>加载失败：{error?.message ?? '未知错误'}</Text>
        <Pressable style={styles.retryBtn} onPress={() => void refetch()}>
          <Text style={styles.retryText}>点击重试</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlashList
      data={rows}
      keyExtractor={(item) => `${item.left?.id ?? 'x'}-${item.right?.id ?? 'x'}`}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.col}>
            {item.left ? <NoteCard note={item.left} /> : null}
          </View>
          <View style={styles.col}>
            {item.right ? <NoteCard note={item.right} /> : null}
          </View>
        </View>
      )}
      contentContainerStyle={styles.listContent}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={onRefresh}
          tintColor={colors.brand[500]}
          colors={[colors.brand[500]]}
        />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.hint}>这里还没有内容，去发布第一条吧</Text>
        </View>
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footerLoading}>
            <ActivityIndicator color={colors.brand[500]} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  col: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: spacing.sm,
  },
  hint: {
    color: colors.inkMuted,
    fontSize: 13,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  retryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brand[500],
    borderRadius: radii.full,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryText: {
    color: colors.onBrand,
    fontSize: 13,
    fontWeight: '700',
  },
  footerLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
