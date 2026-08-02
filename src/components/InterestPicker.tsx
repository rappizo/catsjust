'use client';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { InterestInput } from '@/lib/actions/interests';

interface InterestPickerProps {
  topics: { slug: string; name: string }[];
  breeds: string[];
  selected: InterestInput[];
  onChange: (selected: InterestInput[]) => void;
}

/** 兴趣标签选择器：话题 + 猫咪品种（设置页 / 注册页共用） */
export function InterestPicker({ topics, breeds, selected, onChange }: InterestPickerProps) {
  const { t } = useI18n();
  const MAX = 12;

  const toggle = (type: 'topic' | 'breed', value: string) => {
    const exists = selected.some((s) => s.type === type && s.value === value);
    if (exists) {
      onChange(selected.filter((s) => !(s.type === type && s.value === value)));
    } else {
      if (selected.length >= MAX) return;
      onChange([...selected, { type, value }]);
    }
  };

  const isOn = (type: 'topic' | 'breed', value: string) =>
    selected.some((s) => s.type === type && s.value === value);

  const chip = (on: boolean) =>
    cn(
      'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition',
      on ? 'bg-brand-500 text-[#04281a] shadow-neon-green' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-stone-600">{t('interests', 'title')}</p>
        <span className="text-xs text-stone-400">
          {selected.length}/{MAX}
        </span>
      </div>

      {/* 话题 */}
      <div>
        <p className="mb-2 text-xs font-semibold text-stone-400">{t('interests', 'topics')}</p>
        <div className="flex flex-wrap gap-2">
          {topics.map((tp) => (
            <button
              key={tp.slug}
              type="button"
              onClick={() => toggle('topic', tp.slug)}
              className={chip(isOn('topic', tp.slug))}
            >
              # {tp.name}
            </button>
          ))}
        </div>
      </div>

      {/* 品种 */}
      <div>
        <p className="mb-2 text-xs font-semibold text-stone-400">{t('interests', 'breeds')}</p>
        <div className="flex flex-wrap gap-2">
          {breeds.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => toggle('breed', b)}
              className={chip(isOn('breed', b))}
            >
              🐾 {b}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-stone-400">{t('interests', 'hint')}</p>
    </div>
  );
}
