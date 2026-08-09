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
import { MasonryFlashList } from '@shopify/flash-list';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchFeed, type FeedKind } from './api';
import { NoteCard } from '@/components/NoteCard';
import { colors, radii, spacing } from '@/core/theme';

interface FeedScreenProps {
  kind: FeedKind;
}

/**
 * 信息流（MasonryFlashList 瀑布流）。
 * - 游客：recommend 自动降级为 hot（对齐 Web 首页逻辑）
 * - 上拉加载更多、下拉刷新（推荐流带 shuffle 扰动）
 */
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
    <MasonryFlashList
      data={notes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <NoteCard note={item} />}
      numColumns={2}
      estimatedItemSize={260}
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
