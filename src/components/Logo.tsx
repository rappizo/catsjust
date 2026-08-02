import Link from 'next/link';
import { Cat as CatIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('group flex items-center gap-2', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-600 text-[#04281a] shadow-md shadow-brand-500/30 transition-transform group-hover:scale-105">
        <CatIcon className="h-5 w-5" />
      </span>
      <span className="text-xl font-bold tracking-tight text-ink">
        只有猫
        <span className="ml-1.5 align-middle text-[10px] font-medium tracking-widest text-accent-400">
          Just Cats Here
        </span>
      </span>
    </Link>
  );
}
