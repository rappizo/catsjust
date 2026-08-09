import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BackButton } from '@/components/BackButton';
import { UserRow } from '@/components/UserRow';
import { fetchFollowersList, fetchProfileByUsername } from '@/features/profile/api';
import { colors, spacing } from '@/core/theme';

/** 粉丝列表（对齐 Web /profile/[username]/followers） */
export default function FollowersScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();

  const { data: profile } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => fetchProfileByUsername(username!),
    enabled: !!username,
  });

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['followers-list', profile?.id],
    queryFn: () => fetchFollowersList(profile!.id),
    enabled: !!profile,
  });

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.title}>粉丝</Text>
      </View>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UserRow user={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>还没有粉丝</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 52,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  empty: {
    color: colors.inkMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
