'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Pencil, Plus, Save, X } from 'lucide-react';
import { createTopic, setTopicVisibility, updateTopic } from '@/lib/actions/admin';
import type { Topic } from '@/lib/types';

export function TopicManager({ initialTopics }: { initialTopics: Topic[] }) {
  const router = useRouter();
  const [topics, setTopics] = useState(initialTopics);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  function resetForm() {
    setForm({ name: '', slug: '', description: '' });
    setCreating(false);
    setEditingId(null);
    setError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusyId('new');
    setError('');
    const res = await createTopic({ name: form.name, slug: form.slug || form.name, description: form.description });
    if (res.ok) {
      resetForm();
      router.refresh();
    } else {
      setError(res.error);
    }
    setBusyId(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editForm.name.trim()) return;
    setBusyId(editingId);
    setError('');
    const res = await updateTopic(editingId, editForm);
    if (res.ok) {
      resetForm();
      router.refresh();
    } else {
      setError(res.error);
    }
    setBusyId(null);
  }

  async function handleToggleVisibility(topic: Topic) {
    setBusyId(topic.id);
    const res = await setTopicVisibility(topic.id, topic.status === 'active');
    if (!res.ok) setError(res.error);
    router.refresh();
    setBusyId(null);
  }

  function startEdit(topic: Topic) {
    setEditingId(topic.id);
    setEditForm({ name: topic.name, description: topic.description || '' });
    setCreating(false);
    setError('');
  }

  return (
    <div className="space-y-6">
      {/* 新建话题 */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-card">
        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-[#04281a] transition hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            新建话题
          </button>
        ) : (
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink">新建话题</h3>
              <button type="button" onClick={resetForm} className="text-stone-400 hover:text-stone-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="话题名称，如：猫咪美照"
                className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
              />
              <input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="slug（英文），如：beauty"
                className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </div>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="话题简介（可选）"
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={busyId === 'new'}
              className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-[#04281a] transition hover:bg-brand-600 disabled:opacity-60"
            >
              {busyId === 'new' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              创建
            </button>
          </form>
        )}
      </div>

      {/* 话题列表 */}
      <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-card">
        <ul className="divide-y divide-stone-50">
          {topics.map((topic) => (
            <li key={topic.id} className="px-5 py-4">
              {editingId === topic.id ? (
                <form onSubmit={handleUpdate} className="space-y-3">
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-xl border border-stone-200 px-4 py-2 text-sm outline-none focus:border-brand-400"
                  />
                  <input
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="话题简介"
                    className="w-full rounded-xl border border-stone-200 px-4 py-2 text-sm outline-none focus:border-brand-400"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={busyId === topic.id}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-[#04281a] disabled:opacity-60"
                    >
                      {busyId === topic.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-500"
                    >
                      取消
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-ink"># {topic.name}</p>
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-400">
                        /{topic.slug}
                      </span>
                      {topic.status === 'hidden' && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                          已隐藏
                        </span>
                      )}
                    </div>
                    {topic.description && (
                      <p className="mt-0.5 truncate text-xs text-stone-400">{topic.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => startEdit(topic)}
                      className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-500 transition hover:bg-stone-50"
                    >
                      <Pencil className="h-3 w-3" />
                      编辑
                    </button>
                    <button
                      onClick={() => handleToggleVisibility(topic)}
                      disabled={busyId === topic.id}
                      className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-500 transition hover:bg-stone-50 disabled:opacity-60"
                    >
                      {busyId === topic.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : topic.status === 'active' ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                      {topic.status === 'active' ? '隐藏' : '显示'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
