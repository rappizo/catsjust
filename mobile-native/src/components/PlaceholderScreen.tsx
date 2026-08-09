import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/core/theme';

/** N0 占位页：标注后续阶段实现目标 */
export function PlaceholderScreen({ title, hint }: { title: string; hint: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  hint: {
    color: colors.inkMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
