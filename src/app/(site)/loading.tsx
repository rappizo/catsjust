import { Cat as CatIcon } from 'lucide-react';

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-4 py-32 text-stone-400 sm:px-6">
      <CatIcon className="h-12 w-12 animate-bounce text-brand-400" />
      <p className="text-sm">喵岛加载中…</p>
    </div>
  );
}
