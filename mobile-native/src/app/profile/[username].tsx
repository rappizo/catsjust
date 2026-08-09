import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '@/components/BackButton';
import { Avatar } from '@/components/Avatar';
import { FollowButton } from '@/components/FollowButton';
import { NoteCard } from '@/components/NoteCard';
import { CatCard } from '@/components/CatCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { getOrCreateConversation } from '@/features/messages/api';
import {
  fetchFollowCounts,
  fetchIsFollowing,
  fetchProfileByUsername,
  fetchProfileCats,
  fetchProfileComments,
  fetchProfileFavorites,
  fetchProfileLikes,
  fetchProfileWorks,
  type ProfileComment,
} from '@/features/profile/api';
import { formatCount, timeAgo } from '@/core/utils';
import { colors, radii, spacing } from '@/core/theme';
import type { Note } from '@/core/types';

type TabKey = 'works' | 'favorites' | 'likes' | 'comments' | 'cats';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'works', label: '作品' },
  { key: 'favorites', label: '收藏' },
  { key: 'likes', label: '赞过' },
  { key: 'comments', label: '评论' },
  { key: 'cats', label: '猫咪' },
];

/** 个人主页：头部 + 统计 + Tab（作品/收藏/赞过/评论/猫咪）+ 关注按钮（对齐 Web /profile/[username]） */
export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('works');
  const [msgBusy, setMsgBusy] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => fetchProfileByUsername(username!),
    enabled: !!username,
  });
  const isOwner = !!user && user.id === profile?.id;

  const { data: counts } = useQuery({
    queryKey: ['follow-counts', profile?.id],
    queryFn: () => fetchFollowCounts(profile!.id),
    enabled: !!profile,
  });

  const { data: isFollowing = false } = useQuery({
    queryKey: ['is-following', profile?.id, user?.id ?? 'guest'],
    queryFn: () => fetchIsFollowing(profile!.id),
    enabled: !!profile && !!user && !isOwner,
  });

  const { data: works = [] } = useQuery({
    queryKey: ['profile-works', profile?.id, isOwner],
    queryFn: () => fetchProfileWorks(profile!.id, isOwner),
    enabled: !!profile,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['profile-favs', profile?.id],
    queryFn: () => fetchProfileFavorites(profile!.id),
    enabled: !!profile && tab === 'favorites',
  });

  const { data: likes = [] } = useQuery({
    queryKey: ['profile-likes', profile?.id],
    queryFn: () => fetchProfileLikes(profile!.id),
    enabled: !!profile && tab === 'likes',
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['profile-comments', profile?.id],
    queryFn: () => fetchProfileComments(profile!.id),
    enabled: !!profile && tab === 'comments',
  });

  const { data: cats = [] } = useQuery({
    queryKey: ['profile-cats', profile?.id],
    queryFn: () => fetchProfileCats(profile!.id),
    enabled: !!profile && tab === 'cats',
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }
  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>用户不存在</Text>
      </View>
    );
  }

  const publishedWorks = works.filter((n) => n.status === 'published');
  const receivedLikes = publishedWorks.reduce((s, n) => s + (n.like_count ?? 0), 0);
  const receivedFavorites = publishedWorks.reduce((s, n) => s + (n.favorite_count ?? 0), 0);
  const name = profile.nickname || profile.username;

  const onMessage = async () => {
    if (msgBusy) return;
    setMsgBusy(true);
    try {
      const res = await getOrCreateConversation(profile.id);
      if (res.ok) {
        router.push(`/messages/${res.conversationId}`);
      } else {
        Alert.alert('无法私信', res.error);
      }
    } catch {
      Alert.alert('无法私信', '请稍后重试');
    }
    setMsgBusy(false);
  };


  const renderNoteGrid = (notes: Note[]) => (
    <View style={styles.grid}>
      {notes.map((note) => (
        <View key={note.id} style={styles.gridItem}>
          <NoteCard note={note} />
        </View>
      ))}
      {notes.length === 0 && <Text style={styles.empty}>这里还没有内容</Text>}
    </View>
  );

  const renderComments = (items: ProfileComment[]) =>
    items.length === 0 ? (
      <Text style={styles.empty}>还没有评论</Text>
    ) : (
      items.map((c) => (
        <Pressable
          key={c.id}
          style={styles.commentRow}
          onPress={() => c.note && router.push(`/note/${c.note.id}`)}
        >
          <Text style={styles.commentContent} numberOfLines={2}>
            {c.content}
          </Text>
          <Text style={styles.commentMeta}>
            {c.note?.title ?? '笔记'} · {timeAgo(c.created_at)}
          </Text>
        </Pressable>
      ))
    );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.topTitle} numberOfLines={1}>
          {name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 头部卡片 */}
        <View style={styles.headCard}>
          {profile.cover_url && (
            <View style={styles.cover}>
              <Avatar src={profile.cover_url} name={name} size={100} />
            </View>
          )}
          <View style={styles.headRow}>
            <Avatar src={profile.avatar_url} name={name} size={72} />
            <View style={styles.headInfo}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.username}>@{profile.username}</Text>
            </View>
            {!isOwner && (
              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [styles.msgBtn, pressed && styles.pressed]}
                  onPress={() => void onMessage()}
                  disabled={msgBusy}
                >
                  {msgBusy ? (
                    <ActivityIndicator color={colors.ink} size="small" />
                  ) : (
                    <>
                      <Ionicons name="chatbubble-outline" size={16} color={colors.ink} />
                      <Text style={styles.msgBtnText}>私信</Text>
                    </>
                  )}
                </Pressable>
                <FollowButton targetUserId={profile.id} initialFollowing={isFollowing} />
              </View>
            )}
          </View>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          {/* 统计行（可点击） */}
          <View style={styles.stats}>
            <StatItem
              label="作品"
              value={formatCount(publishedWorks.length)}
              onPress={() => setTab('works')}
            />
            <StatItem
              label="关注"
              value={formatCount(counts?.following ?? 0)}
              onPress={() => router.push(`/profile/${profile.username}/following`)}
            />
            <StatItem
              label="粉丝"
              value={formatCount(counts?.followers ?? 0)}
              onPress={() => router.push(`/profile/${profile.username}/followers`)}
            />
            <StatItem label="获赞" value={formatCount(receivedLikes)} />
            <StatItem label="收藏" value={formatCount(receivedFavorites)} />
          </View>
        </View>

        {/* Tab 栏 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Tab 内容 */}
        {tab === 'works' && renderNoteGrid(works)}
        {tab === 'favorites' && renderNoteGrid(favorites)}
        {tab === 'likes' && renderNoteGrid(likes)}
        {tab === 'comments' && renderComments(comments)}
        {tab === 'cats' &&
          (cats.length === 0 ? (
            <Text style={styles.empty}>还没有猫咪档案</Text>
          ) : (
            <View style={styles.grid}>
              {cats.map((cat) => (
                <View key={cat.id} style={styles.gridItem}>
                  <CatCard
                    cat={{
                      id: cat.id,
                      name: cat.name,
                      breed: cat.breed,
                      gender: cat.gender,
                      bio: cat.bio,
                      avatar_url: cat.avatar_url,
                    }}
                  />
                </View>
              ))}
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

function StatItem({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const inner = (
    <>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );
  if (!onPress) return <View style={styles.stat}>{inner}</View>;
  return (
    <Pressable style={styles.stat} onPress={onPress}>
      {inner}
    </Pressable>
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
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cover: {
    marginBottom: -36,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  username: {
    color: colors.inkMuted,
    fontSize: 13,
  },
  bio: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.inkMuted,
    fontSize: 11,
  },
  tabRow: {
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.bg,
  },
  tabActive: {
    backgroundColor: colors.brand[500],
  },
  tabText: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.onBrand,
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
  pressed: {
    opacity: 0.8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  msgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  msgBtnText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  commentRow: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  commentContent: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  commentMeta: {
    color: colors.inkMuted,
    fontSize: 11,
  },
  empty: {
    color: colors.inkMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
