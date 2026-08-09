import { getSupabase } from '@/core/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CAT_BREEDS } from '@/core/constants';
import type { Cat, Note, Profile, Topic } from '@/core/types';

export interface SearchResults {
  notes: Note[];
  profiles: Profile[];
  topics: Topic[];
  cats: Cat[];
  breedHits: string[];
}

/** 全局搜索（对齐 Web /search：笔记/用户/话题/猫咪/品种） */
export async function searchAll(q: string): Promise<SearchResults> {
  const supabase = getSupabase();
  const query = q.trim();
  const empty: SearchResults = { notes: [], profiles: [], topics: [], cats: [], breedHits: [] };
  if (!query) return empty;

  const [notesRes, profilesRes, topicsRes, catsRes] = await Promise.all([
    supabase
      .from('notes')
      .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
      .eq('status', 'published')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('profiles')
      .select('*')
      .eq('status', 'active')
      .or(`nickname.ilike.%${query}%,username.ilike.%${query}%,bio.ilike.%${query}%`)
      .limit(10),
    supabase
      .from('topics')
      .select('*')
      .eq('status', 'active')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(10),
    supabase
      .from('cats')
      .select('*')
      .eq('status', 'active')
      .or(`name.ilike.%${query}%,breed.ilike.%${query}%,bio.ilike.%${query}%`)
      .limit(10),
  ]);

  return {
    notes: (notesRes.data ?? []) as Note[],
    profiles: (profilesRes.data ?? []) as Profile[],
    topics: (topicsRes.data ?? []) as Topic[],
    cats: (catsRes.data ?? []) as Cat[],
    breedHits: CAT_BREEDS.filter((b) => b.includes(query)),
  };
}

/** 热搜 Top8（search_logs 公开可读） */
export async function fetchHotSearches(): Promise<Array<{ query: string; count: number }>> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('search_logs')
    .select('query, count')
    .order('count', { ascending: false })
    .limit(8);
  return (data ?? []) as Array<{ query: string; count: number }>;
}

// ---------- 本地搜索历史（Web 用 localStorage，App 用 AsyncStorage） ----------

const HISTORY_KEY = 'catsjust_search_history';
const HISTORY_MAX = 10;

export async function getSearchHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function addSearchHistory(q: string): Promise<string[]> {
  const query = q.trim();
  if (!query) return getSearchHistory();
  try {
    const list = await getSearchHistory();
    const next = [query, ...list.filter((x) => x !== query)].slice(0, HISTORY_MAX);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch {
    return getSearchHistory();
  }
}

export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}
