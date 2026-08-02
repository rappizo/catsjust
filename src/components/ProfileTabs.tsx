'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, PawPrint } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Waterfall } from './Waterfall';
import { Avatar } from './Avatar';
import type { Cat, CommentItem, Note } from '@/lib/types';

interface ProfileTabsProps {
  worksNotes: Note[];
  favoritesNotes: Note[];
  likesNotes: Note[];
  /** 该用户的评论（含所属笔记） */
  comments: CommentItem[];
  /** 该用户的猫咪档案 */
  cats: Cat[];
  /** 是否本人主页（决定空状态文案） */
  isOwner: boolean;
}

type TabKey = 'works' | 'favorites' | 'likes' | 'comments' | 'cats';

/** 用户主页内容 Tab：作品 / 收藏 / 赞过 / 评论 / 猫咪 */
export function ProfileTabs({
  worksNotes,
  favoritesNotes,
  likesNotes,
  comments,
  cats,
  isOwner,
}: ProfileTabsProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>('works');

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: 'works', label: t('profile', 'worksTitle'), count: worksNotes.length },
    { key: 'favorites', label: t('profile', 'favoritesTab'), count: favoritesNotes.length },
    { key: 'likes', label: t('profile', 'likesTab'), count: likesNotes.length },
    { key: 'comments', label: t('profile', 'commentsTab'), count: comments.length },
    { key: 'cats', label: t('profile', 'catsTab'), count: cats.length },
  ];

  const dataFor: Record<'works' | 'favorites' | 'likes', { notes: Note[]; empty: string; desc: string }> = {
    works: {
      notes: worksNotes,
      empty: t('profile', 'noWorks'),
      desc: isOwner ? t('profile', 'firstPublish') : t('profile', 'noContentYet'),
    },
    favorites: {
      notes: favoritesNotes,
      empty: t('profile', 'noFavorites'),
      desc: isOwner ? t('profile', 'ownEmptyFavorites') : t('profile', 'noFavorites'),
    },
    likes: {
      notes: likesNotes,
      empty: t('profile', 'noLikes'),
      desc: isOwner ? t('profile', 'ownEmptyLikes') : t('profile', 'noLikes'),
    },
  };

  return (
    <div>
      {/* Tab 栏（横向可滚动） */}
      <div className="no-scrollbar -mx-1 mb-5 flex items-center gap-1 overflow-x-auto border-b border-stone-200/70 px-1">
        {tabs.map((tItem) => (
          <button
            key={tItem.key}
            onClick={() => setTab(tItem.key)}
            className={cn(
              'relative -mb-px shrink-0 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === tItem.key ? 'text-brand-600' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            {tItem.label}
            {typeof tItem.count === 'number' && (
              <span className="ml-1 text-xs text-stone-400">({tItem.count})</span>
            )}
            {tab === tItem.key && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500" />
            )}
          </button>
        ))}
      </div>

      {/* 作品 / 收藏 / 赞过 */}
      {(tab === 'works' || tab === 'favorites' || tab === 'likes') && (
        <Waterfall
          key={tab}
          initialNotes={dataFor[tab].notes}
          staticMode
          emptyTitle={dataFor[tab].empty}
          emptyDescription={dataFor[tab].desc}
        />
      )}

      {/* 评论 */}
      {tab === 'comments' &&
        (comments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200/60 bg-white py-16 text-center shadow-card">
            <MessageCircle className="h-9 w-9 text-stone-300" />
            <p className="font-semibold text-stone-600">{t('profile', 'noComments')}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {comments.map((c) => {
              const note = (c as CommentItem & { note?: { id: string; title: string | null; cover_url: string | null; media_type: string } | null }).note;
              return (
                <li key={c.id}>
                  <Link
                    href={`/notes/${c.note_id}`}
                    className="flex items-start gap-3 rounded-2xl border border-stone-200/60 bg-white p-4 shadow-card transition hover:border-brand-300 hover:shadow-card-hover"
                  >
                    {note?.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={note.cover_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">
                        {note?.media_type === 'video' ? '🎬' : '🐱'}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-stone-500">
                        {t('profile', 'commentedOn')}{' '}
                        <span className="font-medium text-brand-600">
                          《{note?.title || t('profile', 'untitled')}》
                        </span>
                      </p>
                      <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm text-stone-700">
                        {c.content}
                      </p>
                      <p className="mt-1 text-xs text-stone-400">{timeAgo(c.created_at)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}

      {/* 猫咪 */}
      {tab === 'cats' &&
        (cats.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200/60 bg-white py-16 text-center shadow-card">
            <PawPrint className="h-9 w-9 text-stone-300" />
            <p className="font-semibold text-stone-600">{t('profile', 'noCats')}</p>
            {isOwner && (
              <Link
                href="/publish"
                className="rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-2 text-sm font-semibold text-white shadow-neon-green transition hover:brightness-110"
              >
                {t('profile', 'createCat')}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cats.map((cat) => (
              <Link
                key={cat.id}
                href={`/cats/${cat.id}`}
                className="group overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-gradient-to-br from-brand-100 to-accent-50">
                  {cat.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cat.avatar_url}
                      alt={cat.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-5xl">🐱</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate font-semibold text-ink">{cat.name}</p>
                  {cat.breed && (
                    <p className="mt-0.5 text-[11px] text-stone-400">{cat.breed}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ))}
    </div>
  );
}
