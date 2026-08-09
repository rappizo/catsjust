import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthProvider';
import { signOut } from '@/features/auth/api';
import { Avatar } from '@/components/Avatar';
import { colors, radii, spacing } from '@/core/theme';

/** 我：用户卡 + 菜单入口（完整主页/搜索）+ 退出登录 */
export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const router = useRouter();
  const username = profile?.username;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我</Text>
      </View>

      {/* 用户卡 */}
      <Pressable
        style={styles.userCard}
        onPress={() => username && router.push(`/profile/${username}`)}
      >
        <Avatar
          src={profile?.avatar_url}
          name={profile?.nickname ?? profile?.username}
          size={64}
        />
        <View style={styles.userInfo}>
          <Text style={styles.nickname}>{profile?.nickname || '猫友'}</Text>
          <Text style={styles.username}>@{profile?.username ?? '…'}</Text>
          {profile?.bio ? (
            <Text style={styles.bio} numberOfLines={2}>
              {profile.bio}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
      </Pressable>

      {/* 菜单 */}
      <View style={styles.menu}>
        <MenuItem
          icon="person-outline"
          label="我的主页"
          onPress={() => username && router.push(`/profile/${username}`)}
        />
        <MenuItem
          icon="search-outline"
          label="搜索"
          onPress={() => router.push('/search')}
        />
        <MenuItem
          icon="settings-outline"
          label="设置"
          onPress={() => router.push('/settings')}
        />
      </View>

      <Pressable
        style={styles.signOutBtn}
        onPress={() => {
          void signOut();
        }}
      >
        <Text style={styles.signOutText}>退出登录</Text>
      </Pressable>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.brand[400]} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} style={styles.menuArrow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  nickname: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  username: {
    color: colors.inkMuted,
    fontSize: 13,
  },
  bio: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 2,
  },
  menu: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
  menuLabel: {
    color: colors.ink,
    fontSize: 15,
    flex: 1,
  },
  menuArrow: {
    marginLeft: 'auto',
  },
  signOutBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    paddingVertical: 13,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  signOutText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});
