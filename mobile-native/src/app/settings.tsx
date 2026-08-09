import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BackButton } from '@/components/BackButton';
import { useAuth } from '@/features/auth/AuthProvider';
import { signOut } from '@/features/auth/api';
import { changePassword, updateProfile } from '@/features/settings/api';
import { colors, radii, spacing } from '@/core/theme';

/** 设置页：编辑资料（昵称/简介）+ 修改密码 + 退出登录（对齐 Web /settings） */
export default function SettingsScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();

  // 资料
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  // 修改密码
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const onSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await updateProfile({ nickname, bio });
      if (res.ok) {
        refreshProfile();
        Alert.alert('已保存', res.message ?? '资料已更新');
      } else {
        Alert.alert('保存失败', res.error);
      }
    } catch {
      Alert.alert('保存失败', '请稍后重试');
    }
    setSavingProfile(false);
  };

  const onChangePassword = async () => {
    setSavingPassword(true);
    try {
      const res = await changePassword(oldPassword, newPassword, confirm);
      if (res.ok) {
        setOldPassword('');
        setNewPassword('');
        setConfirm('');
        Alert.alert('成功', res.message ?? '密码修改成功');
      } else {
        Alert.alert('修改失败', res.error);
      }
    } catch {
      Alert.alert('修改失败', '请稍后重试');
    }
    setSavingPassword(false);
  };

  const onSignOut = () => {
    Alert.alert('退出登录', '确定退出当前账号吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.topTitle}>设置</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* 账号信息 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>账号</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>邮箱</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {profile?.username ? `${profile.username}@catsjust.local` : '—'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>CATSJUST ID</Text>
            <Text style={styles.infoValue}>@{profile?.username ?? '—'}</Text>
          </View>
        </View>

        {/* 编辑资料 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>编辑资料</Text>
          <TextInput
            style={styles.input}
            placeholder="昵称"
            placeholderTextColor={colors.inkMuted}
            value={nickname}
            onChangeText={setNickname}
            maxLength={30}
          />
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="简介（最多 200 字）"
            placeholderTextColor={colors.inkMuted}
            value={bio}
            onChangeText={setBio}
            maxLength={200}
            multiline
            textAlignVertical="top"
          />
          <Pressable
            style={[styles.primaryBtn, savingProfile && styles.btnDisabled]}
            onPress={() => void onSaveProfile()}
            disabled={savingProfile}
          >
            {savingProfile ? (
              <ActivityIndicator color={colors.onBrand} size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>保存资料</Text>
            )}
          </Pressable>
        </View>

        {/* 修改密码 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>修改密码</Text>
          <TextInput
            style={styles.input}
            placeholder="当前密码"
            placeholderTextColor={colors.inkMuted}
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="新密码（至少 6 位）"
            placeholderTextColor={colors.inkMuted}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="确认新密码"
            placeholderTextColor={colors.inkMuted}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoCapitalize="none"
          />
          <Pressable
            style={[styles.primaryBtn, savingPassword && styles.btnDisabled]}
            onPress={() => void onChangePassword()}
            disabled={savingPassword}
          >
            {savingPassword ? (
              <ActivityIndicator color={colors.onBrand} size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>修改密码</Text>
            )}
          </Pressable>
        </View>

        {/* 法律 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>法律</Text>
          <Pressable style={styles.linkRow} onPress={() => router.push('/privacy')}>
            <Text style={styles.linkText}>隐私政策</Text>
          </Pressable>
          <Pressable style={styles.linkRow} onPress={() => router.push('/terms')}>
            <Text style={styles.linkText}>用户协议</Text>
          </Pressable>
        </View>

        <Pressable style={styles.signOutBtn} onPress={onSignOut}>
          <Text style={styles.signOutText}>退出登录</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  topTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: colors.inkMuted,
    fontSize: 13,
  },
  infoValue: {
    color: colors.ink,
    fontSize: 13,
    maxWidth: '60%',
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    color: colors.ink,
    fontSize: 14,
  },
  bioInput: {
    minHeight: 80,
  },
  primaryBtn: {
    backgroundColor: colors.brand[500],
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.onBrand,
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  linkRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  linkText: {
    color: colors.brand[400],
    fontSize: 14,
  },
  signOutBtn: {
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
