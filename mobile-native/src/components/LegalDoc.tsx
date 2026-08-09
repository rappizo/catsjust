import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackButton } from './BackButton';
import { colors, radii, spacing } from '@/core/theme';

interface LegalDocProps {
  title: string;
  updatedAt: string;
  intro: string;
  sections: { title: string; body: string[] }[];
}

/** 法律文档页（隐私政策 / 用户协议，内容与 Web 端一致） */
export function LegalDoc({ title, updatedAt, intro, sections }: LegalDocProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.topTitle}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>{updatedAt}</Text>
        <Text style={styles.intro}>{intro}</Text>
        {sections.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            {s.body.map((p, i) => (
              <Text key={i} style={styles.body}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
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
  topTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  updated: {
    color: colors.inkMuted,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  intro: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  body: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
});
