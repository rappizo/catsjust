'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { CatGender } from '@/lib/types';
import { CatEditSheet } from './CatEditSheet';

interface CatEditButtonProps {
  catId: string;
  cat: {
    name: string;
    breed: string | null;
    gender: CatGender;
    birthday: string | null;
    personality_tags: string[];
    bio: string | null;
    avatar_url: string | null;
  };
  breeds: string[];
}

/** 猫咪档案「编辑」按钮（仅本人可见） */
export function CatEditButton({ catId, cat, breeds }: CatEditButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-600 transition hover:border-brand-300 hover:text-brand-600"
      >
        <Pencil className="h-3.5 w-3.5" />
        编辑档案
      </button>
      <CatEditSheet catId={catId} cat={cat} breeds={breeds} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
