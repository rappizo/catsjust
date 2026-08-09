import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '@/components/BackButton';
import { NoteCard } from '@/components/NoteCard';
import { UserRow } from '@/components/UserRow';
import { CatCard } from '@/components/CatCard';
import {
  addSearchHistory,
  clearSearchHistory,
  fetchHotSearches,
  getSearchHistory,
  searchAll,
} from '@/features/search/api';
import { colors, radii, spacing } from '@/core/theme';

/** 搜索：热搜 + 本地历史 + 全局结果（笔记/用户/话题/猫咪/品种，对齐 Web /search） */
export default function SearchScreen() {
  const { q: initialQ } = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const [q, setQ] = useState(initialQ ?? '');
  const [submitted, setSubmitted] = useState(initialQ ?? '');
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    void getSearchHistory().then(setHistory);
  }, []);

  const onSearch = async (text: string) => {
    const query = text.trim();
    setQ(query);
    setSubmitted(query);
    if (query) {
      const next = await addSearchHistory(query);
      setHistory(next);
    }
  };

  const { data: hotSearches = [] } = useQuery({
    queryKey: ['hot-searches'],
    queryFn: fetchHotSearches,
    enabled: !submitted,
    staleTime: 60_000,
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => searchAll(submitted),
    enabled: !!submitted,
  });

  const showSuggestions = !submitted;
  const hasResults =
    !!results &&
    (results.notes.length > 0 ||
      results.profiles.length > 0 ||
      results.cats.length > 0 ||
      results.topics.length > 0 ||
      results.breedHits.length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <BackButton />
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.inkMuted} />
          <TextInput
            style={styles.input}
            placeholder="搜索内容 / 用户 / 猫咪 / 品种"
            placeholderTextColor={colors.inkMuted}
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => void onSearch(q)}
            returnKeyType="search"
            autoFocus={!initialQ}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')} hitSlop={6}>
              <Ionicons name="close-circle" size={16} color={colors.inkMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {showSuggestions ? (
          <>
            {/* 热搜 */}
            {hotSearches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔥 热搜</Text>
                <View style={styles.tagWrap}>
                  {hotSearches.map((h, i) => (
                    <Pressable
                      key={h.query}
                      style={[styles.tag, i < 3 && styles.tagHot]}
                      onPress={() => {
                        setQ(h.query);
                        void onSearch(h.query);
                      }}
                    >
                      <Text style={[styles.tagText, i < 3 && styles.tagTextHot]}>
                        {i < 3 ? `${i + 1}. ` : ''}
                        {h.query}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* 搜索历史 */}
            {history.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>最近搜索</Text>
                  <Pressable
                    onPress={() => {
                      void clearSearchHistory();
                      setHistory([]);
                    }}
                    hitSlop={6}
                  >
                    <Text style={styles.clear}>清空</Text>
                  </Pressable>
                </View>
                <View style={styles.tagWrap}>
                  {history.map((h) => (
                    <Pressable
                      key={h}
                      style={styles.tag}
                      onPress={() => {
                        setQ(h);
                        void onSearch(h);
                      }}
                    >
                      <Text style={styles.tagText}>{h}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : isLoading ? (
          <ActivityIndicator color={colors.brand[500]} style={{ marginTop: 40 }} />
        ) : !hasResults ? (
          <Text style={styles.empty}>没有找到与「{submitted}」相关的内容</Text>
        ) : (
          <>
            {/* 用户 */}
            {results!.profiles.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>用户</Text>
                {results!.profiles.map((p) => (
                  <UserRow key={p.id} user={p} showFollow={false} />
                ))}
              </View>
            )}

            {/* 猫咪 */}
            {results!.cats.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>猫咪</Text>
                <View style={styles.grid}>
                  {results!.cats.map((cat) => (
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
              </View>
            )}

            {/* 话题 + 品种 */}
            {(results!.topics.length > 0 || results!.breedHits.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>话题 / 品种</Text>
                <View style={styles.tagWrap}>
                  {results!.topics.map((t) => (
                    <Pressable
                      key={t.id}
                      style={styles.tag}
                      onPress={() => router.push(`/search?q=${encodeURIComponent(`#${t.name}`)}`)}
                    >
                      <Text style={styles.tagText}># {t.name}</Text>
                    </Pressable>
                  ))}
                  {results!.breedHits.map((b) => (
                    <Pressable
                      key={b}
                      style={styles.tag}
                      onPress={() => {
                        setQ(b);
                        void onSearch(b);
                      }}
                    >
                      <Text style={styles.tagText}>#{b}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* 笔记 */}
            {results!.notes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>笔记</Text>
                <View style={styles.grid}>
                  {results!.notes.map((note) => (
                    <View key={note.id} style={styles.gridItem}>
                      <NoteCard note={note} />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
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
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    padding: 0,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  clear: {
    color: colors.inkMuted,
    fontSize: 12,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.card,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tagHot: {
    backgroundColor: colors.brand[50],
  },
  tagText: {
    color: colors.ink,
    fontSize: 13,
  },
  tagTextHot: {
    color: colors.brand[400],
    fontWeight: '600',
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
    paddingVertical: spacing.xl,
  },
});
