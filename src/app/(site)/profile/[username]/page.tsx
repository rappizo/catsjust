import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Waterfall } from '@/components/Waterfall';
import { Avatar } from '@/components/Avatar';
import { formatDate } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/config';
import type { Note, Profile } from '@/lib/types';

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
    description: profile?.bio?.slice(0, 80) || '喵岛用户主页',
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

  let query = supabase
    .from('notes')
    .select('*, cat:cats(*)')
    .eq('author_id', typedProfile.id)
    .order('created_at', { ascending: false });

  if (!isOwner) {
    query = query.eq('status', 'published');
  }

  const { data: notes } = await query;
  const typedNotes = (notes ?? []) as Note[];
  const publishedCount = isOwner
    ? typedNotes.filter((n) => n.status === 'published').length
    : typedNotes.length;

  const name = typedProfile.nickname || typedProfile.username;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* 主页头部 */}
      <div className="overflow-hidden rounded-3xl border border-stone-200/60 bg-white shadow-card">
        {/* 封面 */}
        <div className="relative h-36 w-full bg-gradient-to-r from-brand-400 via-orange-300 to-amber-200 sm:h-48">
          {typedProfile.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typedProfile.cover_url}
              alt="封面"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="pointer-events-none absolute bottom-1 right-6 select-none text-7xl opacity-30">
              🐱
            </span>
          )}
        </div>

        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-wrap items-end gap-4">
            <span className="rounded-full border-4 border-white shadow">
              <Avatar src={typedProfile.avatar_url} alt={name} size="xl" />
            </span>
            <div className="flex-1 pb-1">
              <h1 className="text-xl font-bold text-ink sm:text-2xl">{name}</h1>
              <p className="text-sm text-stone-400">@{typedProfile.username}</p>
            </div>
            {isOwner && (
              <Link
                href="/settings"
                className="mb-1 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50"
              >
                编辑资料
              </Link>
            )}
          </div>

          {typedProfile.bio && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
              {typedProfile.bio}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-stone-500">
            <span>
              <strong className="font-semibold text-ink">{publishedCount}</strong> 篇作品
            </span>
            <span className="text-stone-300">·</span>
            <span>加入于 {formatDate(typedProfile.created_at)}</span>
            {typedProfile.role === 'admin' && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                管理员
              </span>
            )}
          </div>

          {typedProfile.status === 'banned' && !isOwner && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">
              该用户已被封禁，其内容已不可见。
            </p>
          )}
        </div>
      </div>

      {/* 作品 */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-ink">TA 的作品</h2>
        {typedProfile.status === 'banned' && !isOwner ? (
          <p className="py-12 text-center text-sm text-stone-400">该用户的内容已隐藏</p>
        ) : (
          <Waterfall
            initialNotes={typedNotes.filter((n) => isOwner || n.status === 'published')}
            staticMode
            emptyTitle="还没有作品"
            emptyDescription={isOwner ? '去发布你的第一篇猫咪笔记吧' : 'TA 还没有发布过内容'}
          />
        )}
      </div>
    </div>
  );
}
