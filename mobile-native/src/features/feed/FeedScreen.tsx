import { useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList, type FlashListRef, type ListRenderItem } from '@shopify/flash-list';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchFeed, type FeedKind } from './api';
import { NoteCard, coverAspect } from '@/components/NoteCard';
import { colors, radii, spacing } from '@/core/theme';

interface FeedScreenProps {
  kind: FeedKind;
}

type FeedNote = Awaited<ReturnType<typeof fetchFeed>>['notes'][number];

/** 瀑布流间距：列内卡片上下 4px（连贯），左右列间隙 8px，页面左右留白 8px */
const CARD_GAP = 4;
const COL_GAP = 8;
const PAGE_PAD = spacing.sm; // 8

/** 估算卡片高度（封面按 aspectRatio + 标题区 + footer 区），用于把笔记分配到较矮的列 */
function estimateCardHeight(note: FeedNote, columnWidth: number): number {
  const coverH = columnWidth / coverAspect(note.id);
  const titleH = note.title ? 8 + 19 * 2 + 6 : 0; // paddingTop8 + 标题两行 19*2 + 底部余量
  const footerH = 6 + 12 + 2 + 12 + 10; // paddingTop6 + 作者行12 + gap2 + 猫标签12 + paddingBottom10
  return coverH + titleH + footerH;
}

/** 贪心分配：每张卡放进当前总高较矮的列（经典 Masonry 列分配 → 左右错落） */
function splitIntoColumns(
  notes: FeedNote[],
  columnWidth: number
): { left: FeedNote[]; right: FeedNote[] } {
  const left: FeedNote[] = [];
  const right: FeedNote[] = [];
  let leftH = 0;
  let rightH = 0;
  for (const note of notes) {
    const h = estimateCardHeight(note, columnWidth) + CARD_GAP;
    if (leftH <= rightH) {
      left.push(note);
      leftH += h;
    } else {
      right.push(note);
      rightH += h;
    }
  }
  return { left, right };
}

/**
 * 瀑布流（真 Masonry）：左右两列独立 FlashList，按封面高度贪心分配左右错落，
 * onScroll 双向同步滚动（flash-list 2.x 已移除 MasonryFlashList，自建双列）。
 * - 列内卡片上下紧贴（CARD_GAP=4），左右列高度不齐 → 上下连贯、左右错落
 * - 游客：recommend 自动降级为 hot（对齐 Web 首页逻辑）
 */
export function FeedScreen({ kind }: FeedScreenProps) {
  const { user } = useAuth();
  // 未登录时推荐流降级为热度流
  const effectiveKind: FeedKind = kind === 'recommend' && !user ? 'hot' : kind;
  const { width } = useWindowDimensions();
  const columnWidth = Math.max((width - PAGE_PAD * 2 - COL_GAP) / 2, 120);

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
  const { left, right } = useMemo(
    () => splitIntoColumns(notes, columnWidth),
    [notes, columnWidth]
  );

  const leftRef = useRef<FlashListRef<FeedNote>>(null);
  const rightRef = useRef<FlashListRef<FeedNote>>(null);
  const syncingRef = useRef(false);

  /** 双向同步滚动：一列滚动时把 offset 同步给另一列（flag 防死循环） */
  const makeSyncScroll = useCallback(
    (from: 'left' | 'right') =>
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (syncingRef.current) return;
        const y = e.nativeEvent.contentOffset.y;
        syncingRef.current = true;
        const other = from === 'left' ? rightRef.current : leftRef.current;
        other?.scrollToOffset({ offset: y, animated: false });
        requestAnimationFrame(() => {
          syncingRef.current = false;
        });
      },
    []
  );

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onRefresh = useCallback(() => {
    if (!isRefetching) void refetch();
  }, [isRefetching, refetch]);

  const renderItem: ListRenderItem<FeedNote> = useCallback(
    ({ item }) => <NoteCard note={item} />,
    []
  );

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

  const sharedProps = {
    renderItem,
    onEndReached,
    onEndReachedThreshold: 0.5,
    showsVerticalScrollIndicator: false,
  };

  return (
    <View style={styles.container}>
      <FlashList
        ref={leftRef}
        data={left}
        keyExtractor={(item) => item.id}
        style={styles.col}
        contentContainerStyle={styles.colContent}
        onScroll={makeSyncScroll('left')}
        scrollEventThrottle={16}
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
        {...sharedProps}
      />
      <View style={styles.colGap} />
      <FlashList
        ref={rightRef}
        data={right}
        keyExtractor={(item) => item.id}
        style={styles.col}
        contentContainerStyle={styles.colContent}
        onScroll={makeSyncScroll('right')}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={onRefresh}
            tintColor={colors.brand[500]}
            colors={[colors.brand[500]]}
          />
        }
        {...sharedProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: PAGE_PAD,
    paddingTop: spacing.sm,
  },
  col: {
    flex: 1,
  },
  colGap: {
    width: COL_GAP,
  },
  colContent: {
    paddingBottom: spacing.md,
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
