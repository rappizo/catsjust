import Link from 'next/link';
import { Cat as CatIcon, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-stone-200/70 bg-white/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-8 text-center sm:px-6">
        <div className="flex items-center gap-2 text-stone-500">
          <CatIcon className="h-5 w-5 text-brand-500" />
          <span className="font-semibold text-stone-700">
            喵岛
            <span className="ml-1 text-[10px] font-medium tracking-widest text-accent-400">
              霓虹猫社区
            </span>
          </span>
        </div>
        <p className="flex items-center gap-1 text-xs text-stone-400">
          一个只属于猫咪的分享社区 · 纯展示 · 无商业
          <Heart className="h-3 w-3 text-rose-400" />
        </p>
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <Link href="/topics" className="transition hover:text-brand-500">
            话题广场
          </Link>
          <span>·</span>
          <span>用户协议（规划中）</span>
          <span>·</span>
          <span>隐私政策（规划中）</span>
        </div>
      </div>
    </footer>
  );
}
