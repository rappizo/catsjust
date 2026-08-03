'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  active: boolean;
  created_at: string;
}

interface AnnouncementManagerProps {
  initialAnnouncements: AnnouncementRow[];
}

/** 公告管理：列表 + 新建 + 启停 + 删除 */
export function AnnouncementManager({ initialAnnouncements }: AnnouncementManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState<AnnouncementRow[]>(initialAnnouncements);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function createAnnouncement() {
    if (busy) return;
    if (!title.trim() || !content.trim()) {
      setError('标题和内容不能为空');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? '创建失败');
        return;
      }
      setTitle('');
      setContent('');
      setShowForm(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch('/api/admin/announcements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setItems((prev) => prev.map((a) => (a.id === id ? { ...a, active: !active } : a)));
      router.refresh();
    } else {
      setError(data.error ?? '操作失败');
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm('确定删除这条公告吗？')) return;
    const res = await fetch('/api/admin/announcements', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setItems((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
    } else {
      setError(data.error ?? '删除失败');
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{error}</p>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-[#04281a] shadow transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          新建公告
        </button>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
          <div className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
              placeholder="公告标题（如：欢迎来到只有猫）"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="公告内容（会在首页顶部展示）"
              className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={createAnnouncement}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-4 py-2 text-sm font-semibold text-[#04281a] shadow-neon-green transition hover:brightness-110 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                发布
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-500"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 py-10 text-center text-sm text-stone-400">
            暂无公告
          </p>
        ) : (
          items.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-ink">{a.title}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                      a.active ? 'bg-brand-50 text-brand-600' : 'bg-stone-100 text-stone-400'
                    )}
                  >
                    {a.active ? '展示中' : '已停用'}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-stone-500">{a.content}</p>
                <p className="mt-1 text-xs text-stone-400">
                  {new Date(a.created_at).toLocaleString('zh-CN', { hour12: false })}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <button
                  onClick={() => toggleActive(a.id, a.active)}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-medium transition',
                    a.active
                      ? 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                  )}
                >
                  {a.active ? '停用' : '启用'}
                </button>
                <button
                  onClick={() => deleteAnnouncement(a.id)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-500 transition hover:bg-red-100"
                >
                  <Trash2 className="h-3 w-3" />
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
