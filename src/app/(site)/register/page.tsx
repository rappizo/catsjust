'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';
import { Cat as CatIcon, ChevronDown, Loader2 } from 'lucide-react';
import { signUp, type ActionResult } from '@/lib/actions/auth';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { HeroBanner } from '@/components/HeroBanner';
import { InterestPicker } from '@/components/InterestPicker';
import type { InterestInput } from '@/lib/actions/interests';

const initialState: ActionResult | null = null;

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [state, formAction] = useFormState(signUp, initialState);
  const [submitting, setSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [interests, setInterests] = useState<InterestInput[]>([]);
  const [showInterests, setShowInterests] = useState(false);
  const [topics, setTopics] = useState<{ slug: string; name: string }[]>([]);
  const [breeds, setBreeds] = useState<string[]>([]);

  // 拉取话题与品种供兴趣选择
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const [{ data: tp }, { data: br }] = await Promise.all([
          supabase.from('topics').select('slug, name').eq('status', 'active').order('sort_order'),
          supabase.from('breeds').select('name').eq('status', 'active').order('sort_order'),
        ]);
        setTopics((tp ?? []).map((x: any) => ({ slug: x.slug, name: x.name })));
        setBreeds((br ?? []).map((x: any) => x.name));
      } catch {
        // 忽略加载失败（兴趣可选）
      }
    })();
  }, []);

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
      setConfirmError(t('auth', 'passwordMismatch'));
      return;
    }
    setConfirmError('');
    setSubmitting(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <HeroBanner />
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center py-6">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-[#04281a] shadow-lg shadow-brand-500/30">
            <CatIcon className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold text-ink">{t('auth', 'registerWelcome')}</h1>
          <p className="mt-1 text-sm text-stone-400">{t('auth', 'registerDesc')}</p>
      </div>

      <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium text-stone-600">
            {t('auth', 'nickname')}
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            required
            maxLength={30}
            placeholder={t('auth', 'nicknamePlaceholder')}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-600">
            {t('auth', 'email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t('auth', 'emailPlaceholder')}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-600">
            {t('auth', 'password')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder={t('auth', 'passwordPlaceholder')}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-stone-600">
            {t('auth', 'confirmPassword')}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            placeholder={t('auth', 'confirmPlaceholder')}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          {confirmError && <p className="mt-1 text-xs text-red-500">{confirmError}</p>}
        </div>

        {/* 可选兴趣（决定推荐流，可跳过） */}
        <div className="rounded-2xl border border-stone-200/60 bg-stone-50/60 p-4">
          <button
            type="button"
            onClick={() => setShowInterests((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium text-stone-600"
          >
            <span>
              {t('interests', 'optional')}
              {interests.length > 0 && (
                <span className="ml-2 rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-semibold text-brand-600">
                  {interests.length}
                </span>
              )}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showInterests ? 'rotate-180' : ''}`} />
          </button>
          {showInterests && (
            <div className="mt-4">
              <InterestPicker topics={topics} breeds={breeds} selected={interests} onChange={setInterests} />
            </div>
          )}
        </div>
        <input type="hidden" name="interests" value={JSON.stringify(interests)} />

        {/* 同意用户协议与隐私政策 */}
        <label className="flex items-start gap-2 text-xs leading-relaxed text-stone-500">
          <input
            type="checkbox"
            name="agree"
            required
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
          />
          <span>
            我已阅读并同意
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-500 hover:text-brand-600"
            >
              《用户协议》
            </Link>
            和
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-500 hover:text-brand-600"
            >
              《隐私政策》
            </Link>
          </span>
        </label>

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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 py-2.5 text-sm font-semibold text-[#04281a] shadow-md shadow-neon-green transition hover:from-brand-600 hover:to-accent-600 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('auth', 'registerBtn')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-400">
        {t('auth', 'haveAccount')}
        <Link href="/login" className="font-medium text-brand-500 hover:text-brand-600">
          {t('auth', 'goLogin')}
        </Link>
      </p>
      </div>
    </div>
  );
}
