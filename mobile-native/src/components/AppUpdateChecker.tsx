import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from '@/core/version';
import { colors, radii, spacing } from '@/core/theme';

const STORAGE_KEY = 'catsjust_seen_version';

/**
 * 版本更新提醒（对齐 Web AppUpdateChecker）：
 * 本地记录的上次确认版本与当前版本不一致时，底部弹出「发现新版本」提示条，
 * 点击去 Web 下载页。
 */
export function AppUpdateChecker() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((seen) => {
        if (seen !== APP_VERSION) setShow(true);
      })
      .catch(() => {});
  }, []);

  if (!show) return null;

  const dismiss = async () => {
    setShow(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, APP_VERSION);
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name="download" size={18} color={colors.brand[500]} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>发现新版本 v{APP_VERSION}</Text>
          <Text style={styles.sub}>点击下载最新版，体验更好</Text>
        </View>
        <Pressable
          style={styles.btn}
          onPress={() => void Linking.openURL('https://www.catsjust.com/download')}
        >
          <Text style={styles.btnText}>去下载</Text>
        </Pressable>
        <Pressable style={styles.close} onPress={() => void dismiss()} hitSlop={6}>
          <Ionicons name="close" size={16} color={colors.inkMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 88,
    paddingHorizontal: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  sub: {
    color: colors.inkMuted,
    fontSize: 11,
  },
  btn: {
    backgroundColor: colors.brand[500],
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  btnText: {
    color: colors.onBrand,
    fontSize: 12,
    fontWeight: '700',
  },
  close: {
    padding: 2,
  },
});
