import type { SupabaseClient } from '@supabase/supabase-js';
import type { Note } from '@/core/types';

/**
 * 为 RPC 返回的「裸笔记」（只有 notes 原始列，无关联对象）批量补齐 author / cat / topic。
 * 迁移自 Web 端 src/lib/noteRelations.ts。
 */
export async function attachNoteRelations(
  supabase: SupabaseClient,
  notes: Note[]
): Promise<Note[]> {
  if (!notes.length) return notes;

  const authorIds = Array.from(new Set(notes.map((n) => n.author_id)));
  const catIds = Array.from(
    new Set(notes.map((n) => n.cat_id).filter((x): x is string => !!x))
  );
  const topicIds = Array.from(
    new Set(notes.map((n) => n.topic_id).filter((x): x is string => !!x))
  );

  const [authorsRes, catsRes, topicsRes] = await Promise.all([
    supabase.from('profiles').select('*').in('id', authorIds),
    catIds.length
      ? supabase.from('cats').select('*').in('id', catIds)
      : Promise.resolve({ data: [] as never[] }),
    topicIds.length
      ? supabase.from('topics').select('*').in('id', topicIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const authorMap = new Map((authorsRes.data ?? []).map((a) => [a.id, a]));
  const catMap = new Map((catsRes.data ?? []).map((c) => [c.id, c]));
  const topicMap = new Map((topicsRes.data ?? []).map((t) => [t.id, t]));

  return notes.map((n) => ({
    ...n,
    author: n.author_id ? (authorMap.get(n.author_id) ?? null) : null,
    cat: n.cat_id ? (catMap.get(n.cat_id) ?? null) : null,
    topic: n.topic_id ? (topicMap.get(n.topic_id) ?? null) : null,
  }));
}
