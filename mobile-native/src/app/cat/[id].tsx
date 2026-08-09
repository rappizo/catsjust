import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BackButton } from '@/components/BackButton';
import { Avatar } from '@/components/Avatar';
import { NoteCard } from '@/components/NoteCard';
import { fetchCatById, fetchCatNotes } from '@/features/cats/api';
import { formatDate, genderLabel } from '@/core/utils';
import { colors, radii, spacing } from '@/core/theme';

/** 猫咪档案：头像/名字/品种 + 信息卡（性别/生日/笔记数/性格）+ bio + 该猫笔记 */
export default function CatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: cat, isLoading: catLoading } = useQuery({
    queryKey: ['cat', id],
    queryFn: () => fetchCatById(id!),
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['cat-notes', id],
    queryFn: () => fetchCatNotes(id!),
    enabled: !!id,
  });

  if (catLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }
  if (!cat) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>猫咪档案不存在</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.topTitle}>{cat.name} 的主页</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 头部 */}
        <View style={styles.card}>
          <Avatar src={cat.avatar_url} name={cat.name} size={80} />
          <View style={styles.headInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{cat.name}</Text>
              {cat.breed ? (
                <View style={styles.breedBadge}>
                  <Text style={styles.breedBadgeText}>{cat.breed}</Text>
                </View>
              ) : null}
            </View>
            {cat.owner && (
              <Pressable onPress={() => router.push(`/profile/${cat.owner?.username ?? ''}`)}>
                <Text style={styles.owner}>👤 {cat.owner.nickname || cat.owner.username}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* 信息卡 */}
        <View style={styles.infoGrid}>
          <InfoItem label="性别" value={genderLabel(cat.gender)} />
          <InfoItem label="生日" value={cat.birthday ? formatDate(cat.birthday) : '未知'} />
          <InfoItem label="笔记数" value={`${notes.length}`} />
          <InfoItem
            label="性格"
            value={cat.personality_tags.length ? cat.personality_tags.slice(0, 3).join(' · ') : '待解锁'}
          />
        </View>

        {/* bio */}
        {cat.bio ? <Text style={styles.bio}>{cat.bio}</Text> : null}

        {/* 该猫的笔记 */}
        <Text style={styles.sectionTitle}>TA 的笔记</Text>
        <View style={styles.grid}>
          {notes.map((note) => (
            <View key={note.id} style={styles.gridItem}>
              <NoteCard note={note} />
            </View>
          ))}
          {notes.length === 0 && <Text style={styles.empty}>还没有笔记</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 52,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.inkMuted,
    fontSize: 14,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headInfo: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  name: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  breedBadge: {
    backgroundColor: colors.brand[50],
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  breedBadgeText: {
    color: colors.brand[400],
    fontSize: 12,
    fontWeight: '600',
  },
  owner: {
    color: colors.inkMuted,
    fontSize: 13,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  infoItem: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  infoLabel: {
    color: colors.inkMuted,
    fontSize: 11,
  },
  infoValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  bio: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: spacing.xs,
  },
  empty: {
    color: colors.inkMuted,
    fontSize: 13,
    textAlign: 'center',
    width: '100%',
    paddingVertical: spacing.xl,
  },
});
