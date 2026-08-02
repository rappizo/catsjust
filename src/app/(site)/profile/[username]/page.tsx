import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Avatar } from '@/components/Avatar';
import { CopyId } from '@/components/CopyId';
import { FollowButton } from '@/components/FollowButton';
import { MessageButton } from '@/components/MessageButton';
import { ProfileTabs } from '@/components/ProfileTabs';
import { cn, formatDate } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/config';
import { getLocaleFromCookies } from '@/lib/i18n/cookies';
import { getT } from '@/lib/i18n/dictionaries';
import { isFollowing, getFollowCounts } from '@/lib/actions/social';
import type { Cat, CommentItem, FollowCounts, Note, Profile } from '@/lib/types';

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  if (!isSupabaseConfigured()) {
    return { title: '用户主页' };
  }
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, bio')
    .eq('username', params.username)
    .maybeSingle();
  return {
    title: profile?.nickname ? `${profile.nickname} 的主页` : '用户主页',
    description: profile?.bio?.slice(0, 80) || '只有猫用户主页',
  };
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
  if (!isSupabaseConfigured()) notFound();

  const supabase = createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .maybeSingle();

  if (!profile) notFound();

  const typedProfile = profile as Profile;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === typedProfile.id;
  const t = getT(getLocaleFromCookies());

  // 关注状态与计数（他人主页、访问者已登录时）
  let initialFollowing = false;
  let followCounts: FollowCounts = { following: 0, followers: 0 };
  if (user && !isOwner) {
    initialFollowing = await isFollowing(user.id, typedProfile.id);
  }
  followCounts = await getFollowCounts(typedProfile.id);

  // 作品（作者视角含非公开）
  let worksQuery = supabase
    .from('notes')
    .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
    .eq('author_id', typedProfile.id)
    .order('created_at', { ascending: false });
  if (!isOwner) {
    worksQuery = worksQuery.eq('status', 'published');
  }
  const { data: worksData } = await worksQuery;
  const worksNotes = (worksData ?? []) as Note[];
  const publishedCount = isOwner
    ? worksNotes.filter((n) => n.status === 'published').length
    : worksNotes.length;

  // 收藏 / 喜欢（只展示已发布内容）
  const favQuery = supabase
    .from('favorites')
    .select('note_id')
    .eq('user_id', typedProfile.id)
    .order('created_at', { ascending: false })
    .limit(100);
  const { data: favs } = await favQuery;
  const favIds = (favs ?? []).map((f) => f.note_id);
  let favoritesNotes: Note[] = [];
  if (favIds.length) {
    const { data: favNotes } = await supabase
      .from('notes')
      .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
      .eq('status', 'published')
      .in('id', favIds);
    favoritesNotes = (favNotes ?? []) as Note[];
  }

  const likeQuery = supabase
    .from('likes')
    .select('note_id')
    .eq('user_id', typedProfile.id)
    .order('created_at', { ascending: false })
    .limit(100);
  const { data: likeRows } = await likeQuery;
  const likeIds = (likeRows ?? []).map((l) => l.note_id);
  let likesNotes: Note[] = [];
  if (likeIds.length) {
    const { data: lNotes } = await supabase
      .from('notes')
      .select('*, author:profiles(*), cat:cats(*), topic:topics(*)')
      .eq('status', 'published')
      .in('id', likeIds);
    likesNotes = (lNotes ?? []) as Note[];
  }

  // 收到的赞 / 收藏（统计已发布作品）
  const publishedWorks = worksNotes.filter((n) => n.status === 'published');
  const receivedLikes = publishedWorks.reduce((s, n) => s + (n.like_count ?? 0), 0);
  const receivedFavorites = publishedWorks.reduce((s, n) => s + (n.favorite_count ?? 0), 0);

  // TA 的评论（含所属笔记）
  const { data: commentRows } = await supabase
    .from('comments')
    .select('*, note:notes(id, title, cover_url, media_type)')
    .eq('user_id', typedProfile.id)
    .order('created_at', { ascending: false })
    .limit(100);
  const profileComments = (commentRows ?? []) as CommentItem[];

  // TA 的猫咪档案
  const { data: catRows } = await supabase
    .from('cats')
    .select('*')
    .eq('owner_id', typedProfile.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);
  const profileCats = (catRows ?? []) as Cat[];

  const name = typedProfile.nickname || typedProfile.username;

  return (
    <div className="mx-auto max-w-7xl px-2 py-3 sm:px-3 sm:py-4">
      {/* 主页头部 */}
      <div className="overflow-hidden rounded-3xl border border-stone-200/60 bg-white shadow-card">
        {/* 封面（仅设置过封面时显示，无封面不再显示渐变占位色块） */}
        {typedProfile.cover_url && (
          <div className="relative h-36 w-full sm:h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={typedProfile.cover_url}
              alt="封面"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className={cn(typedProfile.cover_url ? 'px-6 pb-6' : 'px-6 py-6')}>
          <div className={cn('flex flex-wrap items-end gap-4', typedProfile.cover_url && '-mt-10')}>
            <span className={cn('rounded-full shadow', typedProfile.cover_url && 'border-4 border-white')}>
              <Avatar src={typedProfile.avatar_url} alt={name} size="xl" />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-bold text-ink sm:text-2xl">{name}</h1>
                {typedProfile.role === 'admin' && (
                  <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                    {t('profile', 'admin')}
                  </span>
                )}
              </div>
              <div className="mt-0.5">
                <CopyId username={typedProfile.username} />
              </div>
            </div>
            {isOwner ? (
              <Link
                href="/settings"
                className="mb-1 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50"
              >
                {t('profile', 'editProfile')}
              </Link>
            ) : (
              user && (
                <div className="mb-1 flex items-center gap-2">
                  <FollowButton
                    targetUserId={typedProfile.id}
                    targetUsername={typedProfile.username}
                    initialFollowing={initialFollowing}
                    initialCounts={followCounts}
                  />
                  <MessageButton targetUserId={typedProfile.id} />
                </div>
              )
            )}
          </div>

          {typedProfile.bio && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
              {typedProfile.bio}
            </p>
          )}

          {/* 统计区：作品 / 关注 / 粉丝 / 获赞 / 收藏（数字可点击） */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-500">
            <Link
              href="#profile-content"
              className="transition hover:text-brand-500"
              title={t('profile', 'works')}
            >
              <strong className="font-semibold text-ink">{publishedCount}</strong>{' '}
              {t('profile', 'works')}
            </Link>
            <Link
              href={`/profile/${typedProfile.username}/following`}
              className="transition hover:text-brand-500"
              title={t('profile', 'followingList')}
            >
              <strong className="font-semibold text-ink">{followCounts.following}</strong>{' '}
              {t('profile', 'followingCount')}
            </Link>
            <Link
              href={`/profile/${typedProfile.username}/followers`}
              className="transition hover:text-brand-500"
              title={t('profile', 'followersList')}
            >
              <strong className="font-semibold text-ink">{followCounts.followers}</strong>{' '}
              {t('profile', 'followersCount')}
            </Link>
            <span>
              <strong className="font-semibold text-ink">{receivedLikes}</strong>{' '}
              {t('profile', 'receivedLikes')}
            </span>
            <span>
              <strong className="font-semibold text-ink">{receivedFavorites}</strong>{' '}
              {t('profile', 'receivedFavorites')}
            </span>
            <span className="text-stone-300">·</span>
            <span>{t('profile', 'joinedAt')} {formatDate(typedProfile.created_at)}</span>
          </div>

          {typedProfile.status === 'banned' && !isOwner && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">
              {t('profile', 'bannedUser')}
            </p>
          )}
        </div>
      </div>

      {/* 作品 / 收藏 / 赞过 / 评论 / 猫咪 */}
      <div id="profile-content" className="mt-8">
        {typedProfile.status === 'banned' && !isOwner ? (
          <p className="py-12 text-center text-sm text-stone-400">{t('profile', 'contentHidden')}</p>
        ) : (
          <ProfileTabs
            worksNotes={worksNotes.filter((n) => isOwner || n.status === 'published')}
            favoritesNotes={favoritesNotes}
            likesNotes={likesNotes}
            comments={profileComments}
            cats={profileCats}
            isOwner={isOwner}
          />
        )}
      </div>
    </div>
  );
}
