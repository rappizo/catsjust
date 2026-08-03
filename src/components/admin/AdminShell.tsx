'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bug, Cat, FileCheck, Flag, FolderSearch, LayoutDashboard, LogOut, PawPrint, ShieldAlert, ShieldCheck, Tags, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { adminLogout } from '@/lib/actions/admin-auth';

const NAV = [
  { href: '/admin', label: '仪表盘', icon: LayoutDashboard },
  { href: '/admin/review', label: '内容审核', icon: FileCheck },
  { href: '/admin/reports', label: '举报处理', icon: Flag },
  { href: '/admin/content', label: '内容管理', icon: FolderSearch },
  { href: '/admin/users', label: '用户管理', icon: Users },
  { href: '/admin/topics', label: '话题管理', icon: Tags },
  { href: '/admin/breeds', label: '品种管理', icon: PawPrint },
  { href: '/admin/sensitive-words', label: '敏感词', icon: ShieldAlert },
  { href: '/admin/errors', label: '错误日志', icon: Bug },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await adminLogout();
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="flex">
        {/* 侧边栏（桌面端） */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-stone-200 bg-white md:flex">
          <div className="flex h-16 items-center border-b border-stone-100 px-5">
            <Logo />
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    active
                      ? 'bg-brand-500/10 text-brand-600'
                      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-stone-100 p-3">
            <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-stone-50 px-3 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-500">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">
                管理员
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-stone-500 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
            <Link
              href="/"
              className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-stone-500 transition hover:bg-stone-50 hover:text-stone-700"
            >
              <Cat className="h-4 w-4" />
              返回前台
            </Link>
          </div>
        </aside>

        {/* 主区域 */}
        <div className="min-w-0 flex-1">
          {/* 顶栏（移动端） */}
          <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-stone-200 bg-white px-4 md:hidden">
            <Logo />
            <span className="ml-auto rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600">
              管理后台
            </span>
          </div>
          <nav className="no-scrollbar sticky top-14 z-10 flex gap-1 overflow-x-auto border-b border-stone-200 bg-white px-4 py-2 md:hidden">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                    active ? 'bg-brand-500 text-[#04281a]' : 'bg-stone-100 text-stone-500'
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
