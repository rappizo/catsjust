'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';
import { Cat as CatIcon, Loader2 } from 'lucide-react';
import { signIn, type ActionResult } from '@/lib/actions/auth';

const initialState: ActionResult | null = null;

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(signIn, initialState);
  const [submitting, setSubmitting] = useState(false);

  // 登录成功后跳转（优先回到来源页面）
  const next = searchParams.next && searchParams.next.startsWith('/') ? searchParams.next : '/';
  useEffect(() => {
    if (state?.ok) {
      router.push(next);
    }
  }, [state, router, next]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/30">
          <CatIcon className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-bold text-ink">欢迎回到喵岛</h1>
        <p className="mt-1 text-sm text-stone-400">登录后继续云吸猫</p>
      </div>

      <form action={formAction} onSubmit={() => setSubmitting(true)} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-600">
            邮箱
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-600">
            密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="请输入密码"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {state && !state.ok && (
          <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          登录
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-400">
        还没有账号？
        <Link href="/register" className="font-medium text-brand-500 hover:text-brand-600">
          立即注册
        </Link>
      </p>
    </div>
  );
}
