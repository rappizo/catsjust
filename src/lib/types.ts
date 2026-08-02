export type Role = 'user' | 'admin';
export type UserStatus = 'active' | 'banned';
export type NoteStatus = 'pending' | 'published' | 'rejected' | 'removed';
export type MediaType = 'image' | 'video';
export type CatGender = 'male' | 'female' | 'unknown';

export interface Profile {
  id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  role: Role;
  status: UserStatus;
  language?: string | null;
  created_at: string;
}

export interface Cat {
  id: string;
  owner_id: string;
  name: string;
  breed: string | null;
  gender: CatGender;
  birthday: string | null;
  personality_tags: string[];
  bio: string | null;
  avatar_url: string | null;
  status: 'active' | 'banned';
  created_at: string;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  description: string | null;
  sort_order: number;
  status: 'active' | 'hidden';
  created_at: string;
}

export interface NoteMedia {
  url: string;
  type: MediaType;
  poster?: string | null;
}

export interface Note {
  id: string;
  author_id: string;
  cat_id: string | null;
  topic_id: string | null;
  title: string | null;
  content: string | null;
  media: NoteMedia[];
  cover_url: string | null;
  media_type: MediaType;
  status: NoteStatus;
  reject_reason: string | null;
  like_count: number;
  comment_count: number;
  favorite_count: number;
  hot_score?: number;
  created_at: string;
  updated_at: string;
  author?: Profile | null;
  cat?: Cat | null;
  topic?: Topic | null;
}

export interface CommentItem {
  id: string;
  note_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  like_count?: number;
  created_at: string;
  author?: Profile | null;
  replies?: CommentItem[];
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface FollowCounts {
  following: number;
  followers: number;
}

export type NotificationType = 'like' | 'comment' | 'follow' | 'system';

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  note_id: string | null;
  comment_id: string | null;
  content: string | null;
  read: boolean;
  created_at: string;
  actor?: Profile | null;
  note?: Pick<Note, 'id' | 'title' | 'cover_url' | 'media'> | null;
}
