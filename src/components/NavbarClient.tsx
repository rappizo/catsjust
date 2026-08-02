'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Compass, LogIn, LogOut, Menu, PenSquare, Plus, Settings, Shield, User as UserIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { signOut } from '@/lib/actions/auth';

interface NavbarClientProps {
  user: { id: string; email: string } | null;
  profile: { username: string; nickname: string; avatar_url: string | null; role: string } | null;
}

const NAV_LINKS = [
  { href: '/', labelKey: 'home', icon: Compass },
  { href: '/topics', labelKey: 'topics', icon: PenSquare },
  { href: '/publish', labelKey: 'publish', icon: Plus },
];

export function NavbarClient({ user, profile }: NavbarClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    setDropdownOpen(false);
    router.refresh();
  }

  const nickname = profile?.nickname || '喵友';
  const profileHref = profile ? `/profile/${profile.username}` : '/login';

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />

        {/* 桌面端导航 */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-500/10 text-brand-600'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-ink'
                )}
              >
                <link.icon className="h-4 w-4" />
                {t('nav', link.labelKey)}
              </Link>
            );
          })}
        </nav>

        {/* 右侧用户区 */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full p-1 transition hover:bg-stone-100"
                aria-label="用户菜单"
              >
                <Avatar src={profile?.avatar_url} alt={nickname} size="md" />
              </button>

              {dropdownOpen && (
                <div className="animate-fade-in-up absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card-hover">
                  <div className="border-b border-stone-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-ink">{nickname}</p>
                    <p className="truncate text-xs text-stone-400">{user.email}</p>
                  </div>
                  <div className="p-1.5">
                    <DropdownItem href={profileHref} icon={UserIcon} label={t('nav', 'myProfile')} onClick={() => setDropdownOpen(false)} />
                    <DropdownItem href="/publish" icon={PenSquare} label={t('nav', 'publishContent')} onClick={() => setDropdownOpen(false)} />
                    <DropdownItem href="/settings" icon={Settings} label={t('nav', 'settings')} onClick={() => setDropdownOpen(false)} />
                    {profile?.role === 'admin' && (
                      <DropdownItem href="/admin" icon={Shield} label={t('nav', 'admin')} onClick={() => setDropdownOpen(false)} />
                    )}
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-stone-600 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      {signingOut ? t('nav', 'signOutIng') : t('nav', 'signOut')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
              >
                <LogIn className="h-4 w-4" />
                {t('nav', 'login')}
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-neon-green transition hover:from-brand-600 hover:to-accent-600"
              >
                {t('nav', 'register')}
              </Link>
            </div>
          )}

          {/* 移动端菜单按钮 */}
          <button
            className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="菜单"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {menuOpen && (
        <div className="border-t border-stone-200 bg-cream px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                <link.icon className="h-4 w-4" />
                {t('nav', link.labelKey)}
              </Link>
            ))}
            {!user && (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-700"
                >
                  <LogIn className="h-4 w-4" />
                  {t('nav', 'login')}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-3 py-2.5 text-sm font-semibold text-white"
                >
                  {t('nav', 'register')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function DropdownItem({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-50 hover:text-ink"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
