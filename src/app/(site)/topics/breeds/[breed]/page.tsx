import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { Waterfall } from '@/components/Waterfall';
import { CAT_BREEDS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Note } from '@/lib/types';

export const metadata = {
  title: '品种',
};

export default async function BreedPage({ params }: { params: { breed: string } }) {
  const breed = decodeURIComponent(params.breed);

  if (!isSupabaseConfigured() || !(CAT_BREEDS as readonly string[]).includes(breed)) {
    notFound();
  }

  const supabase = createClient();

  // 注意：PostgREST 的嵌套过滤（cat.breed）不会过滤父表，
  // 需先查该品种的猫 id，再用 cat_id in (...) 过滤笔记
  const { data: cats } = await supabase
    .from('cats')
    .select('id')
    .eq('breed', breed)
    .eq('status', 'active');

  const catIds = (cats ?? []).map((c) => c.id);

  let notes: Note[] = [];
  if (catIds.length) {
    const { data } = await supabase
      .from('notes')
      .select('*, author:profiles(*), cat:cats(*)')
      .eq('status', 'published')
      .in('cat_id', catIds)
      .order('created_at', { ascending: false })
      .limit(24);
    notes = (data ?? []) as Note[];
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* 品种头图 */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-stone-200/60 bg-white shadow-card">
        <div className="relative h-36 w-full bg-gradient-to-r from-accent-500 via-purple-500 to-fuchsia-600 sm:h-48">
          <span className="pointer-events-none absolute bottom-2 right-6 select-none text-7xl opacity-40">
            🐱
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <h1 className="absolute bottom-4 left-6 text-2xl font-bold text-white drop-shadow sm:text-3xl">
            # {breed}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-6 py-4">
          <span className="text-xs text-stone-500">按品种逛喵岛：</span>
          {CAT_BREEDS.map((b) => (
            <Link
              key={b}
              href={`/topics/breeds/${encodeURIComponent(b)}`}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition',
                b === breed
                  ? 'border-accent-400 bg-accent-500/20 text-accent-300'
                  : 'border-stone-200 text-stone-500 hover:border-accent-400 hover:text-accent-400'
              )}
            >
              #{b}
            </Link>
          ))}
        </div>
      </div>

      <Waterfall
        initialNotes={(notes ?? []) as Note[]}
        staticMode
        emptyTitle="这个品种还没有内容"
        emptyDescription="快去发布一条吧"
      />
    </div>
  );
}
