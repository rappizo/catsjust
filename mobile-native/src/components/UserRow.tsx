import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';
import { colors } from '@/core/theme';
import type { Profile } from '@/core/types';

interface UserRowProps {
  user: Profile;
  /** 列表内是否显示关注按钮 */
  showFollow?: boolean;
  /** 初始关注态（我关注的列表传 true，粉丝列表可传 false） */
  initialFollowing?: boolean;
}

/** 用户行（关注/粉丝列表、搜索结果用户） */
export function UserRow({ user, showFollow = true, initialFollowing = false }: UserRowProps) {
  const router = useRouter();
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => router.push(`/profile/${user.username}`)}
    >
      <Avatar src={user.avatar_url} name={user.nickname ?? user.username} size={44} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {user.nickname || user.username}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          @{user.username}
          {user.bio ? ` · ${user.bio}` : ''}
        </Text>
      </View>
      {showFollow && <FollowButton targetUserId={user.id} initialFollowing={initialFollowing} size="sm" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.85,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  sub: {
    color: colors.inkMuted,
    fontSize: 12,
  },
});
