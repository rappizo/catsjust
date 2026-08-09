import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { toggleFollow } from '@/features/profile/api';
import { colors, radii } from '@/core/theme';

interface FollowButtonProps {
  targetUserId: string;
  initialFollowing?: boolean;
  size?: 'sm' | 'md';
}

/** 关注 / 取关按钮（点击后本地更新状态） */
export function FollowButton({ targetUserId, initialFollowing = false, size = 'md' }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await toggleFollow(targetUserId);
      setFollowing(res.following);
      if (res.following) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* 失败静默 */
    }
    setBusy(false);
  };

  const compact = size === 'sm';
  return (
    <Pressable
      onPress={() => void onPress()}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.btnSm,
        following && styles.btnFollowing,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.text, compact && styles.textSm, following && styles.textFollowing]}>
        {following ? '已关注' : '+ 关注'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.brand[500],
    borderRadius: radii.full,
    paddingHorizontal: 18,
    paddingVertical: 7,
    minWidth: 84,
    alignItems: 'center',
  },
  btnSm: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    minWidth: 68,
  },
  btnFollowing: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    color: colors.onBrand,
    fontSize: 13,
    fontWeight: '700',
  },
  textSm: {
    fontSize: 12,
  },
  textFollowing: {
    color: colors.inkMuted,
  },
});
