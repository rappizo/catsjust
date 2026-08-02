'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';
import { Cat as CatIcon, Loader2 } from 'lucide-react';
import { signUp, type ActionResult } from '@/lib/actions/auth';

const initialState: ActionResult | null = null;

export default function RegisterPage() {
  const router = useRouter();
  const [state, formAction] = useFormState(signUp, initialState);
  const [submitting, setSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // 注册成功后跳转登录页
  useEffect(() => {
    if (state?.ok) {
      router.push(state.redirectTo ?? '/login');
    }
  }, [state, router]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const password = String(form.password.value ?? '');
    const confirm = String(form.confirmPassword.value ?? '');
    if (password !== confirm) {
      e.preventDefault();
      setConfirmError('两次输入的密码不一致');
      return;
    }
    setConfirmError('');
    setSubmitting(true);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/30">
          <CatIcon className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-bold text-ink">加入喵岛</h1>
        <p className="mt-1 text-sm text-stone-400">注册一个账号，开始记录你的猫</p>
      </div>

      <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium text-stone-600">
            昵称
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            required
            maxLength={30}
            placeholder="例如：铲屎官小张"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
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
            minLength={6}
            autoComplete="new-password"
            placeholder="至少 6 位"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-stone-600">
            确认密码
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            placeholder="再次输入密码"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          {confirmError && <p className="mt-1 text-xs text-red-500">{confirmError}</p>}
        </div>

        {state && !state.ok && (
          <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{state.error}</p>
        )}
        {state?.ok && (
          <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-600">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          注册
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-400">
        已有账号？
        <Link href="/login" className="font-medium text-brand-500 hover:text-brand-600">
          去登录
        </Link>
      </p>
    </div>
  );
}
