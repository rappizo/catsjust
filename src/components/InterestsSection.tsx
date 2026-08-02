'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { InterestPicker } from './InterestPicker';
import { saveInterests, type InterestInput } from '@/lib/actions/interests';

interface InterestsSectionProps {
  topics: { slug: string; name: string }[];
  breeds: string[];
  initial: InterestInput[];
}

/** 设置页：兴趣标签管理（决定推荐流） */
export function InterestsSection({ topics, breeds, initial }: InterestsSectionProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [selected, setSelected] = useState<InterestInput[]>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    const res = await saveInterests(selected);
    if (res.ok) {
      setMessage({ type: 'ok', text: res.message || t('interests', 'saved') });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: res.error });
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-stone-200/60 bg-white p-6 shadow-card">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
        <Sparkles className="h-4 w-4 text-brand-500" />
        {t('interests', 'settingsTitle')}
      </h2>
      <InterestPicker topics={topics} breeds={breeds} selected={selected} onChange={setSelected} />

      {message && (
        <p
          className={
            message.type === 'ok'
              ? 'mt-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-600'
              : 'mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500'
          }
        >
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-[#04281a] transition hover:bg-brand-600 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {t('interests', 'save')}
      </button>
    </div>
  );
}
