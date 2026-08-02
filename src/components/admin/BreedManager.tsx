'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createBreed, deleteBreed, setBreedStatus, updateBreed } from '@/lib/actions/admin';

export interface BreedRow {
  id: string;
  name: string;
  sort_order: number;
  status: 'active' | 'disabled';
  created_at: string;
}

export function BreedManager({ initialBreeds }: { initialBreeds: BreedRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [createForm, setCreateForm] = useState({ name: '', sortOrder: 0 });
  const [editForm, setEditForm] = useState({ name: '', sortOrder: 0 });

  function reset() {
    setCreateForm({ name: '', sortOrder: 0 });
    setCreating(false);
    setEditingId(null);
    setError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setBusyId('new');
    setError('');
    const res = await createBreed(createForm);
    if (res.ok) {
      reset();
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
    const res = await updateBreed(editingId, editForm);
    if (res.ok) {
      reset();
      router.refresh();
    } else {
      setError(res.error);
    }
    setBusyId(null);
  }

  async function toggleStatus(breed: BreedRow) {
    setBusyId(`${breed.id}-toggle`);
    setError('');
    const res = await setBreedStatus(breed.id, breed.status === 'active');
    if (!res.ok) setError(res.error);
    router.refresh();
    setBusyId(null);
  }

  async function handleDelete(breed: BreedRow) {
    if (!window.confirm(`确定删除品种「${breed.name}」吗？`)) return;
    setBusyId(`${breed.id}-delete`);
    setError('');
    const res = await deleteBreed(breed.id);
    if (!res.ok) setError(res.error);
    router.refresh();
    setBusyId(null);
  }

  function startEdit(breed: BreedRow) {
    setEditingId(breed.id);
    setEditForm({ name: breed.name, sortOrder: breed.sort_order });
    setCreating(false);
    setError('');
  }

  return (
    <div className="space-y-6">
      {/* 新建品种 */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-card">
        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            新增品种
          </button>
        ) : (
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink">新增品种</h3>
              <button type="button" onClick={reset} className="text-stone-400 hover:text-stone-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="品种名称，如：金渐层"
                className="min-w-0 flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
              />
              <input
                type="number"
                value={createForm.sortOrder}
                onChange={(e) => setCreateForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                placeholder="排序"
                className="w-28 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={busyId === 'new'}
              className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {busyId === 'new' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              创建
            </button>
          </form>
        )}
      </div>

      {/* 品种列表 */}
      <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-card">
        <ul className="divide-y divide-stone-50">
          {initialBreeds.map((breed) => (
            <li key={breed.id} className="px-5 py-3.5">
              {editingId === breed.id ? (
                <form onSubmit={handleUpdate} className="flex flex-wrap items-center gap-3">
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="min-w-0 flex-1 rounded-xl border border-stone-200 px-4 py-2 text-sm outline-none focus:border-brand-400"
                  />
                  <input
                    type="number"
                    value={editForm.sortOrder}
                    onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                    className="w-24 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={busyId === breed.id}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {busyId === breed.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-500"
                    >
                      取消
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="w-8 shrink-0 text-center text-sm font-semibold text-stone-300">
                    {breed.sort_order}
                  </span>
                  <span className={cn('min-w-0 flex-1 text-sm font-medium', breed.status === 'disabled' ? 'text-stone-400 line-through' : 'text-ink')}>
                    {breed.name}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                      breed.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400'
                    )}
                  >
                    {breed.status === 'active' ? '启用' : '停用'}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => startEdit(breed)}
                      className="flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-500 transition hover:bg-stone-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      编辑
                    </button>
                    <button
                      onClick={() => toggleStatus(breed)}
                      disabled={busyId !== null}
                      className={cn(
                        'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-60',
                        breed.status === 'active'
                          ? 'border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600'
                      )}
                    >
                      {busyId === `${breed.id}-toggle` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : breed.status === 'active' ? (
                        '停用'
                      ) : (
                        '启用'
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(breed)}
                      disabled={busyId !== null}
                      className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-100 disabled:opacity-60"
                    >
                      {busyId === `${breed.id}-delete` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      删除
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
