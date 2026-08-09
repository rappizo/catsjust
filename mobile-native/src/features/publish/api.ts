import { getSupabase } from '@/core/supabase';
import type { Cat, Note, Topic } from '@/core/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.catsjust.com';

export interface NoteMediaInput {
  url: string;
  type: 'image' | 'video';
  poster?: string | null;
}

export interface PublishInput {
  title: string;
  content: string;
  media: NoteMediaInput[];
  coverUrl: string;
  catId?: string | null;
  topicId?: string | null;
}

export type PublishResult =
  | { ok: true; id: string; status: 'pending' | 'published' | 'rejected'; message: string }
  | { ok: false; error: string };

async function bearer(): Promise<string> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('请先登录');
  return session.access_token;
}

async function jsonFetch(url: string, init: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? `请求失败（${res.status}）`);
  }
  return data;
}

/** 发布笔记（走 Web 端 /api/v1/notes：敏感词 + AI 审核） */
export async function publishNote(input: PublishInput): Promise<PublishResult> {
  const token = await bearer();
  const mediaType = input.media[0]?.type === 'video' ? 'video' : 'image';
  const data = await jsonFetch(`${API_BASE_URL}/api/v1/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...input, mediaType }),
  });
  return data as PublishResult;
}

/** 编辑笔记（走 PATCH /api/v1/notes/:id，重新送审） */
export async function editNote(
  noteId: string,
  input: { title: string; content: string; topicId?: string | null }
): Promise<PublishResult> {
  const token = await bearer();
  const data = await jsonFetch(`${API_BASE_URL}/api/v1/notes/${noteId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  return data as PublishResult;
}

/** 删除笔记（走 DELETE /api/v1/notes/:id） */
export async function deleteNote(noteId: string): Promise<void> {
  const token = await bearer();
  await jsonFetch(`${API_BASE_URL}/api/v1/notes/${noteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** 我的猫咪档案（发布时关联选择） */
export async function fetchMyCats(userId: string): Promise<Cat[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('cats')
    .select('*')
    .eq('owner_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  return (data ?? []) as Cat[];
}

/** 话题列表（发布时关联选择） */
export async function fetchTopics(): Promise<Topic[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('topics')
    .select('*')
    .eq('status', 'active')
    .order('sort_order', { ascending: true })
    .limit(50);
  return (data ?? []) as Topic[];
}

/** 编辑模式：加载笔记详情（预填标题/正文/话题） */
export async function fetchNoteForEdit(noteId: string): Promise<Note | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('notes')
    .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
    .eq('id', noteId)
    .maybeSingle();
  return (data as Note) ?? null;
}
