import { getSupabase } from '@/core/supabase';
import type { Cat, Note, Profile } from '@/core/types';

export interface CatCardData {
  id: string;
  name: string;
  breed: string | null;
  gender: Cat['gender'];
  bio: string | null;
  avatar_url: string | null;
  note_count?: number;
  /** 热度：其已发布笔记的总点赞数 */
  hot?: number;
  owner?: Pick<Profile, 'id' | 'username' | 'nickname' | 'avatar_url'> | null;
}

export interface CatsPlazaData {
  cats: CatCardData[];
  breeds: string[];
}

/** 猫咪广场：活跃猫咪 + 品种列表 + 热度计算（对齐 Web /cats 页） */
export async function fetchCatsPlaza(): Promise<CatsPlazaData> {
  const supabase = getSupabase();
  const [catsRes, breedsRes] = await Promise.all([
    supabase
      .from('cats')
      .select(
        'id, name, breed, gender, bio, avatar_url, owner:profiles(id, username, nickname, avatar_url), notes:notes(count)'
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('breeds')
      .select('name')
      .eq('status', 'active')
      .order('sort_order', { ascending: true }),
  ]);

  const cats: CatCardData[] = (catsRes.data ?? []).map((c: any) => {
    const owner = Array.isArray(c.owner) ? c.owner[0] : c.owner;
    const count = Array.isArray(c.notes) ? (c.notes[0] as any)?.count : undefined;
    return {
      id: c.id,
      name: c.name,
      breed: c.breed,
      gender: c.gender,
      bio: c.bio,
      avatar_url: c.avatar_url,
      note_count: typeof count === 'number' ? count : undefined,
      owner: owner ?? null,
    };
  });

  // 猫咪热度 = 其已发布笔记的总点赞数
  const { data: catLikes } = await supabase
    .from('notes')
    .select('cat_id, like_count')
    .eq('status', 'published')
    .not('cat_id', 'is', null)
    .limit(5000);
  const hotMap: Record<string, number> = {};
  (catLikes ?? []).forEach((n: any) => {
    if (n.cat_id) hotMap[n.cat_id] = (hotMap[n.cat_id] ?? 0) + (n.like_count ?? 0);
  });
  cats.forEach((c) => {
    c.hot = hotMap[c.id] ?? 0;
  });

  const breeds = (breedsRes.data ?? []).map((b: any) => b.name);
  return { cats, breeds };
}

/** 猫咪档案（含主人） */
export async function fetchCatById(id: string): Promise<(Cat & { owner?: Profile }) | null> {
  const supabase = getSupabase();
  const { data } = await supabase.from('cats').select('*, owner:profiles(*)').eq('id', id).maybeSingle();
  return (data as (Cat & { owner?: Profile }) | null) ?? null;
}

/** 猫咪下的已发布笔记 */
export async function fetchCatNotes(catId: string): Promise<Note[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('notes')
    .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
    .eq('cat_id', catId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as Note[];
}
