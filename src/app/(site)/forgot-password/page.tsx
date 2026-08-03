'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';
import { ArrowLeft, KeyRound, Loader2, MailCheck } from 'lucide-react';
import { requestPasswordReset, type ActionResult } from '@/lib/actions/auth';

const initialState: ActionResult | null = null;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [state, formAction] = useFormState(requestPasswordReset, initialState);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-1 text-sm text-stone-400 transition hover:text-brand-500"
      >
        <ArrowLeft className="h-4 w-4" />
        返回登录
      </Link>

      <div className="rounded-3xl border border-stone-200/60 bg-white p-6 shadow-card">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-[#04281a] shadow-lg shadow-brand-500/30">
          <KeyRound className="h-7 w-7" />
        </span>
        <h1 className="text-center text-xl font-bold text-ink">找回密码</h1>
        <p className="mt-1 text-center text-sm text-stone-400">
          输入注册邮箱，我们会发送一封重置密码的邮件
        </p>

        {sent || state?.ok ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-brand-50 px-5 py-8 text-center">
            <MailCheck className="h-10 w-10 text-brand-500" />
            <p className="text-sm font-medium text-ink">
              {state?.ok && state.message ? state.message : '重置链接已发送，请查收邮件'}
            </p>
            <p className="text-xs text-stone-400">
              如果 5 分钟内未收到，请检查垃圾邮件，或稍后重试
            </p>
            <button
              onClick={() => router.push('/login')}
              className="mt-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-2 text-sm font-semibold text-[#04281a] shadow-neon-green transition hover:brightness-110"
            >
              返回登录
            </button>
          </div>
        ) : (
          <form action={formAction} onSubmit={() => setSubmitting(true)} className="mt-6 space-y-4">
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

            {state && !state.ok && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 py-3 text-sm font-bold text-[#04281a] shadow-neon-green transition hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              发送重置邮件
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
