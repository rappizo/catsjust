import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { MediaCarousel } from '@/components/MediaCarousel';
import { VideoPlayer } from '@/components/VideoPlayer';
import { NoteActions } from '@/components/NoteActions';
import { CommentSection } from '@/components/CommentSection';
import { VerticalFeed } from '@/components/VerticalFeed';
import { StatusBadge } from '@/components/StatusBadge';
import { NoteDeleteButton } from '@/components/NoteDeleteButton';
import { Avatar } from '@/components/Avatar';
import { timeAgo } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/config';
import type { CommentItem, Note } from '@/lib/types';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  if (!isSupabaseConfigured()) {
    return { title: '猫咪笔记' };
  }
  const supabase = createClient();
  const { data: note } = await supabase
    .from('notes')
    .select('title, content')
    .eq('id', params.id)
    .maybeSingle();
  return {
    title: note?.title || '猫咪笔记',
    description: note?.content?.slice(0, 80) || '只有猫笔记',
  };
}

export default async function NotePage({ params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) notFound();

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: note } = await supabase
    .from('notes')
    .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
    .eq('id', params.id)
    .maybeSingle();

  if (!note) notFound();

  const typed = note as Note;
  const isOwner = user?.id === typed.author_id;

  // ============ 已发布 → 小红书式全屏上下滑信息流 ============
  if (typed.status === 'published') {
    // 拉取信息流（最新 30 篇已发布笔记）
    const { data: feedData } = await supabase
      .from('notes')
      .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(30);

    let feed = (feedData ?? []) as Note[];
    let initialIndex = feed.findIndex((n) => n.id === typed.id);
    if (initialIndex === -1) {
      feed = [typed, ...feed];
      initialIndex = 0;
    }

    // 批量查询信息流内所有笔记的点赞/收藏状态（避免 N+1）
    const feedIds = feed.map((n) => n.id);
    const likedSet = new Set<string>();
    const favoritedSet = new Set<string>();

    if (user) {
      const [{ data: likes }, { data: favs }] = await Promise.all([
        supabase.from('likes').select('note_id').in('note_id', feedIds).eq('user_id', user.id),
        supabase.from('favorites').select('note_id').in('note_id', feedIds).eq('user_id', user.id),
      ]);
      (likes ?? []).forEach((r) => likedSet.add(r.note_id));
      (favs ?? []).forEach((r) => favoritedSet.add(r.note_id));
    } else {
      const guestId = cookies().get('guest_id')?.value;
      if (guestId) {
        const { data: likes } = await supabase
          .from('likes')
          .select('note_id')
          .in('note_id', feedIds)
          .eq('guest_id', guestId);
        (likes ?? []).forEach((r) => likedSet.add(r.note_id));
      }
    }

    const likedMap = Object.fromEntries(feed.map((n) => [n.id, likedSet.has(n.id)]));
    const favoritedMap = Object.fromEntries(feed.map((n) => [n.id, favoritedSet.has(n.id)]));

    let feedCurrentUser: { id: string; nickname: string; avatar_url: string | null } | null = null;
    if (user) {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id, username, nickname, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (myProfile) {
        feedCurrentUser = {
          id: myProfile.id,
          nickname: myProfile.nickname || myProfile.username,
          avatar_url: myProfile.avatar_url,
        };
      }
    }

    return (
      <VerticalFeed
        notes={feed}
        initialIndex={initialIndex}
        likedMap={likedMap}
        favoritedMap={favoritedMap}
        loggedIn={!!user}
        currentUser={feedCurrentUser}
      />
    );
  }
  // ============ 未发布（作者查看自己的待审/被驳回内容）============

  // 当前用户是否已点赞 / 收藏（游客通过 guest_id cookie 识别点赞状态）
  let liked = false;
  let favorited = false;
  if (user) {
    const [{ data: likeRow }, { data: favRow }] = await Promise.all([
      supabase.from('likes').select('id').eq('user_id', user.id).eq('note_id', typed.id).maybeSingle(),
      supabase.from('favorites').select('id').eq('user_id', user.id).eq('note_id', typed.id).maybeSingle(),
    ]);
    liked = !!likeRow;
    favorited = !!favRow;
  } else {
    const guestId = cookies().get('guest_id')?.value;
    if (guestId) {
      const { data: likeRow } = await supabase
        .from('likes')
        .select('id')
        .eq('guest_id', guestId)
        .eq('note_id', typed.id)
        .maybeSingle();
      liked = !!likeRow;
    }
  }

  const { data: comments } = await supabase
    .from('comments')
    .select('*, author:profiles(*)')
    .eq('note_id', typed.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const commentItems = (comments ?? []) as CommentItem[];

  // 当前登录用户的资料（用于评论区输入框）
  let currentUser: { id: string; nickname: string; avatar_url: string | null } | null = null;
  if (user) {
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('id, username, nickname, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    if (myProfile) {
      currentUser = {
        id: myProfile.id,
        nickname: myProfile.nickname || myProfile.username,
        avatar_url: myProfile.avatar_url,
      };
    }
  }
  const isVideo = typed.media_type === 'video';
  const authorName = typed.author?.nickname || typed.author?.username || '喵友';

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* 非公开状态提示 */}
      {typed.status !== 'published' && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <StatusBadge status={typed.status} />
          {typed.status === 'pending' && <span>该内容正在审核中，通过后将公开展示</span>}
          {typed.status === 'rejected' && (
            <span>该内容未通过审核：{typed.reject_reason || '未注明原因'}</span>
          )}
          {typed.status === 'removed' && <span>该内容已被下架</span>}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[1.25fr_1fr]">
        {/* 媒体区 */}
        <div className="md:sticky md:top-20 md:self-start">
          {isVideo ? (
            <VideoPlayer src={typed.media?.[0]?.url ?? ''} poster={typed.media?.[0]?.poster} />
          ) : (
            <MediaCarousel media={typed.media} title={typed.title} />
          )}
        </div>

        {/* 内容区 */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold leading-snug text-ink sm:text-2xl">
              {typed.title || '猫咪笔记'}
            </h1>
            {isOwner && <NoteDeleteButton noteId={typed.id} />}
          </div>

          {typed.content && (
            <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-stone-700">
              {typed.content}
            </p>
          )}

          {/* 关联：猫咪 / 话题 */}
          {(typed.cat || typed.topic) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {typed.cat && (
                <Link
                  href={`/cats/${typed.cat.id}`}
                  className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 transition hover:bg-brand-100"
                >
                  🐾 {typed.cat.name}
                  <ChevronRight className="h-3 w-3" />
                </Link>
              )}
              {typed.topic && (
                <Link
                  href={`/topics/${typed.topic.slug}`}
                  className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-200"
                >
                  # {typed.topic.name}
                </Link>
              )}
              {typed.cat?.breed && (
                <Link
                  href={`/topics/breeds/${encodeURIComponent(typed.cat.breed)}`}
                  className="rounded-full bg-accent-50 px-3 py-1.5 text-xs font-medium text-accent-400 transition hover:bg-accent-100"
                >
                  # {typed.cat.breed}
                </Link>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2 text-xs text-stone-400">
            <CalendarDays className="h-3.5 w-3.5" />
            {timeAgo(typed.created_at)}
          </div>

          {/* 互动操作 */}
          <div className="mt-5 rounded-2xl border border-stone-200/60 bg-white p-3 shadow-card">
            <NoteActions
              noteId={typed.id}
              initialLiked={liked}
              initialFavorited={favorited}
              likeCount={typed.like_count}
              favoriteCount={typed.favorite_count}
              commentCount={typed.comment_count}
              loggedIn={!!user}
              large
            />
          </div>

          {/* 作者卡片 */}
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-stone-200/60 bg-white p-4 shadow-card">
            <Link href={`/profile/${typed.author?.username ?? ''}`} className="shrink-0">
              <Avatar src={typed.author?.avatar_url} alt={authorName} size="lg" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/profile/${typed.author?.username ?? ''}`}
                className="block truncate font-semibold text-ink hover:text-brand-600"
              >
                {authorName}
              </Link>
              {typed.author?.bio ? (
                <p className="line-clamp-1 text-xs text-stone-400">{typed.author.bio}</p>
              ) : (
                <p className="text-xs text-stone-400">一位热爱猫咪的铲屎官</p>
              )}
            </div>
          </div>

          {/* 评论区 */}
          <CommentSection
            noteId={typed.id}
            initialComments={commentItems}
            initialCount={typed.comment_count}
            currentUser={currentUser}
          />
        </div>
      </div>
    </div>
  );
}
