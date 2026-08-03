'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Cat as CatIcon, Home, MessageCircle, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface BottomTabBarProps {
  /** 当前登录用户的 username（用于「我」Tab 跳转），未登录为 null */
  username: string | null;
  /** 消息未读数（通知 + 私信） */
  unreadCount?: number;
}

/**
 * 底部 Tab 栏：首页 / 猫咪 / ＋ / 消息 / 我
 * 桌面端与移动端统一显示（App 骨架）。
 */
export function BottomTabBar({ username, unreadCount = 0 }: BottomTabBarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const meHref = username ? `/profile/${username}` : '/login';

  const isActive = (prefix: string, exact = false) =>
    exact ? pathname === prefix : pathname.startsWith(prefix);

  const itemCls = (active: boolean) =>
    cn(
      'flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors',
      active ? 'text-brand-600' : 'text-stone-400 hover:text-stone-600'
    );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/70 bg-cream/95">
      <div className="mx-auto flex h-16 max-w-7xl items-stretch px-2 pb-[env(safe-area-inset-bottom)]">
        {/* 首页 */}
        <Link href="/" className={cn('flex-1', itemCls(isActive('/', true)))}>
          <Home className="h-[22px] w-[22px]" />
          {t('tab', 'home')}
        </Link>

        {/* 猫咪 */}
        <Link href="/cats" className={cn('flex-1', itemCls(isActive('/cats')))}>
          <CatIcon className="h-[22px] w-[22px]" />
          {t('tab', 'cats')}
        </Link>

        {/* ＋ 发布（与其它 Tab 统一高度，不凸起） */}
        <Link
          href="/publish"
          aria-label={t('tab', 'publish')}
          className={cn('flex-1', itemCls(isActive('/publish')))}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-[#04281a] shadow-neon-green transition hover:brightness-110 active:scale-95">
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </span>
        </Link>

        {/* 消息 */}
        <Link href="/messages" className={cn('relative flex-1', itemCls(isActive('/messages') || isActive('/notifications')))}>
          <MessageCircle className="h-[22px] w-[22px]" />
          {t('tab', 'messages')}
          {unreadCount > 0 && (
            <span className="absolute right-1/2 top-0 flex h-4 min-w-4 translate-x-4 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-1 text-[9px] font-bold text-white shadow">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* 我 */}
        <Link
          href={meHref}
          className={cn('flex-1', itemCls(isActive('/profile') || isActive('/settings') || isActive('/me')))}
        >
          <User className="h-[22px] w-[22px]" />
          {t('tab', 'me')}
        </Link>
      </div>
    </nav>
  );
}
