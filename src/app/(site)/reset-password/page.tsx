'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';
import { Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { updatePassword, type ActionResult } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/client';

const initialState: ActionResult | null = null;

/** 通过重置邮件进入后设置新密码（需先完成邮箱链接的会话交换） */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, formAction] = useFormState(updatePassword, initialState);
  const [submitting, setSubmitting] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
    });
  }, []);

  useEffect(() => {
    if (state?.ok) {
      router.push('/login');
    }
  }, [state, router]);

  if (authed === false) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
        <div className="rounded-3xl border border-stone-200/60 bg-white p-6 text-center shadow-card">
          <ShieldCheck className="mx-auto h-12 w-12 text-amber-400" />
          <h1 className="mt-4 text-lg font-bold text-ink">链接无效或已过期</h1>
          <p className="mt-2 text-sm text-stone-400">
            请通过邮件中的重置链接进入本页；若链接已过期，请重新发起找回密码。
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-block rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-2 text-sm font-semibold text-[#04281a] shadow-neon-green transition hover:brightness-110"
          >
            重新找回密码
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-3xl border border-stone-200/60 bg-white p-6 shadow-card">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-[#04281a] shadow-lg shadow-brand-500/30">
          <LockKeyhole className="h-7 w-7" />
        </span>
        <h1 className="text-center text-xl font-bold text-ink">设置新密码</h1>
        <p className="mt-1 text-center text-sm text-stone-400">请设置一个新的登录密码</p>

        <form action={formAction} onSubmit={() => setSubmitting(true)} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-600">
              新密码
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
            <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-stone-600">
              确认新密码
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="再次输入新密码"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {state && !state.ok && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || authed === null}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 py-3 text-sm font-bold text-[#04281a] shadow-neon-green transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            确认修改
          </button>
        </form>
      </div>
    </div>
  );
}
