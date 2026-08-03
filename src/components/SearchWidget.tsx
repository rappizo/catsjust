'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, History, Trash2 } from 'lucide-react';

const HISTORY_KEY = 'catsjust_search_history';
const HISTORY_LIMIT = 10;

interface SearchWidgetProps {
  /** 当前搜索词（非空时写入本地历史） */
  q?: string;
  /** 热搜词（服务端传入） */
  hotSearches: Array<{ query: string; count: number }>;
}

/** 搜索历史（localStorage）+ 热搜词 */
export function SearchWidget({ q = '', hotSearches }: SearchWidgetProps) {
  const [history, setHistory] = useState<string[]>([]);

  // 读取历史 + 把当前搜索词写入历史
  useEffect(() => {
    let list: string[] = [];
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) list = JSON.parse(raw) as string[];
    } catch {
      list = [];
    }
    if (q) {
      const next = [q, ...list.filter((x) => x !== q)].slice(0, HISTORY_LIMIT);
      list = next;
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* 忽略 */
      }
    }
    setHistory(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function clearHistory() {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* 忽略 */
    }
    setHistory([]);
  }

  if (q) return null; // 有搜索词时只写入历史，不展示区块（结果页保持干净）

  if (history.length === 0 && hotSearches.length === 0) return null;

  return (
    <div className="mt-6 space-y-5">
      {history.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-stone-400">
              <History className="h-4 w-4" />
              搜索历史
            </span>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1 text-xs text-stone-400 transition hover:text-stone-600"
            >
              <Trash2 className="h-3 w-3" />
              清空
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <Link
                key={h}
                href={`/search?q=${encodeURIComponent(h)}`}
                className="rounded-full border border-stone-200/70 bg-white px-3 py-1.5 text-xs text-stone-500 transition hover:border-brand-400 hover:text-brand-500"
              >
                {h}
              </Link>
            ))}
          </div>
        </div>
      )}

      {hotSearches.length > 0 && (
        <div>
          <span className="mb-2 flex items-center gap-1.5 text-sm font-medium text-stone-400">
            <Flame className="h-4 w-4 text-orange-400" />
            大家都在搜
          </span>
          <div className="flex flex-wrap gap-2">
            {hotSearches.map((s, i) => (
              <Link
                key={s.query}
                href={`/search?q=${encodeURIComponent(s.query)}`}
                className="rounded-full border border-stone-200/70 bg-white px-3 py-1.5 text-xs text-stone-500 transition hover:border-brand-400 hover:text-brand-500"
              >
                <span className={`mr-1 font-bold ${i < 3 ? 'text-orange-400' : 'text-stone-300'}`}>{i + 1}</span>
                {s.query}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
