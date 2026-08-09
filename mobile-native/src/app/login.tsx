import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/AuthProvider';
import { signIn, signUp } from '@/features/auth/api';
import { colors, radii, spacing } from '@/core/theme';

type Mode = 'login' | 'signup';

/** 登录 / 注册（邮箱 + 密码 + 昵称；注册即登录，无需邮箱确认） */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { user, initialized } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!initialized) return null;
  // 已登录（含注册即登录）→ 直接进首页
  if (user) return <Redirect href="/(tabs)" />;

  const onSubmit = async () => {
    setError('');
    setLoading(true);
    const res =
      mode === 'login'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, nickname.trim());
    setLoading(false);
    if (!res.ok) setError(res.error);
    // 成功后 AuthProvider 更新 user，(tabs) 守卫自动放行
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + spacing.xl }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🐾 只有猫</Text>
        <Text style={styles.subtitle}>只属于猫咪的内容分享社区</Text>

        <View style={styles.card}>
          <View style={styles.segmented}>
            {(
              [
                { key: 'login', label: '登录' },
                { key: 'signup', label: '注册' },
              ] as const
            ).map((s) => {
              const active = mode === s.key;
              return (
                <Pressable
                  key={s.key}
                  style={[styles.segItem, active && styles.segItemActive]}
                  onPress={() => {
                    setMode(s.key);
                    setError('');
                  }}
                >
                  <Text style={[styles.segText, active && styles.segTextActive]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {mode === 'signup' ? (
            <TextInput
              style={styles.input}
              placeholder="昵称"
              placeholderTextColor={colors.inkMuted}
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="none"
            />
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="邮箱"
            placeholderTextColor={colors.inkMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="密码"
            placeholderTextColor={colors.inkMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.submit, pressed && styles.submitPressed]}
            onPress={() => void onSubmit()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Text style={styles.submitText}>{mode === 'login' ? '登录' : '注册并登录'}</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.tos}>
          登录即代表同意《用户协议》与《隐私政策》（详见 www.catsjust.com/terms）
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  logo: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: 3,
  },
  segItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.md - 2,
  },
  segItemActive: {
    backgroundColor: colors.brand[500],
  },
  segText: {
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  segTextActive: {
    color: colors.onBrand,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  submit: {
    backgroundColor: colors.brand[500],
    borderRadius: radii.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitPressed: {
    opacity: 0.85,
  },
  submitText: {
    color: colors.onBrand,
    fontSize: 15,
    fontWeight: '700',
  },
  tos: {
    color: colors.inkMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 16,
  },
});
