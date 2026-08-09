import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PickedMedia } from './media';

/** 发布草稿（本地自动保存，杀进程不丢） */
export interface PublishDraft {
  title: string;
  content: string;
  catId: string | null;
  topicId: string | null;
  media: PickedMedia[];
  updatedAt: number;
}

const KEY = 'catsjust_publish_draft';

export async function saveDraft(draft: PublishDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch {
    /* 草稿保存失败不影响主流程 */
  }
}

export async function loadDraft(): Promise<PublishDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PublishDraft) : null;
  } catch {
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
