'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createSensitiveWord,
  deleteSensitiveWord,
  setSensitiveWordStatus,
} from '@/lib/actions/admin';

export interface SensitiveWordRow {
  id: string;
  word: string;
  status: 'active' | 'disabled';
  created_at: string;
}

export function SensitiveWordManager({ initialWords }: { initialWords: SensitiveWordRow[] }) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const w = input.trim();
    if (!w) return;
    setBusyId('new');
    setError('');
    const res = await createSensitiveWord(w);
    if (res.ok) {
      setInput('');
      router.refresh();
    } else {
      setError(res.error);
    }
    setBusyId(null);
  }

  async function toggleStatus(word: SensitiveWordRow) {
    setBusyId(`${word.id}-toggle`);
    setError('');
    const res = await setSensitiveWordStatus(word.id, word.status === 'active');
    if (!res.ok) setError(res.error);
    router.refresh();
    setBusyId(null);
  }

  async function handleDelete(word: SensitiveWordRow) {
    if (!window.confirm(`确定删除敏感词「${word.word}」吗？`)) return;
    setBusyId(`${word.id}-delete`);
    setError('');
    const res = await deleteSensitiveWord(word.id);
    if (!res.ok) setError(res.error);
    router.refresh();
    setBusyId(null);
  }

  const activeCount = initialWords.filter((w) => w.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* 新增敏感词 */}
      <form onSubmit={handleAdd} className="flex flex-wrap gap-3 rounded-2xl border border-stone-200/60 bg-white p-5 shadow-card">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入要拦截的敏感词，如：xxx"
          className="min-w-0 flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
        />
        <button
          type="submit"
          disabled={busyId === 'new'}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {busyId === 'new' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          新增
        </button>
      </form>

      {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{error}</p>}

      <p className="text-xs text-stone-400">
        当前启用 {activeCount} / 共 {initialWords.length} 个。命中启用中的敏感词时，发布与评论会被拦截。
      </p>

      {/* 敏感词列表 */}
      <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-card">
        {!initialWords.length ? (
          <p className="px-5 py-12 text-center text-sm text-stone-400">还没有敏感词，先新增一个吧</p>
        ) : (
          <ul className="divide-y divide-stone-50">
            {initialWords.map((w) => (
              <li key={w.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={cn(
                    'min-w-0 flex-1 font-mono text-sm font-medium',
                    w.status === 'active' ? 'text-ink' : 'text-stone-400 line-through'
                  )}
                >
                  {w.word}
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                    w.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400'
                  )}
                >
                  {w.status === 'active' ? '启用中' : '已停用'}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => toggleStatus(w)}
                    disabled={busyId !== null}
                    className={cn(
                      'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-60',
                      w.status === 'active'
                        ? 'border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    )}
                  >
                    {busyId === `${w.id}-toggle` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : w.status === 'active' ? (
                      '停用'
                    ) : (
                      '启用'
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(w)}
                    disabled={busyId !== null}
                    className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    {busyId === `${w.id}-delete` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
