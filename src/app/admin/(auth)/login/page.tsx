'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';
import { Loader2, Lock, ShieldCheck, User as UserIcon } from 'lucide-react';
import { adminLogin, type AdminAuthResult } from '@/lib/actions/admin-auth';

const initialState: AdminAuthResult | null = null;

export default function AdminLoginPage() {
  const router = useRouter();
  const [state, formAction] = useFormState(adminLogin, initialState);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      router.push('/admin');
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-600 text-[#04281a] shadow-neon-green">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h1 className="text-xl font-bold text-ink">管理后台登录</h1>
          <p className="mt-1 text-sm text-stone-400">只有猫 · CATSJUST 运营入口</p>
        </div>

        <form action={formAction} onSubmit={() => setSubmitting(true)} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-stone-500">
              用户名
            </label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                placeholder="管理员用户名"
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-500">
              密码
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="管理员密码"
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          {state && !state.ok && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 py-2.5 text-sm font-semibold text-[#04281a] shadow-neon-green transition hover:from-brand-600 hover:to-accent-600 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            登录后台
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-400">
          账号密码由部署环境变量 <code className="font-mono">ADMIN_USERNAME / ADMIN_PASSWORD</code>{' '}
          配置
        </p>
        <div className="mt-3 text-center">
          <Link href="/" className="text-xs text-brand-500 transition hover:text-brand-600">
            ← 返回前台
          </Link>
        </div>
      </div>
    </div>
  );
}
