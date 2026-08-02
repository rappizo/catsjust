import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { Waterfall } from '@/components/Waterfall';
import type { Note } from '@/lib/types';

export default async function TopicPage({ params }: { params: { slug: string } }) {
  if (!isSupabaseConfigured()) notFound();

  const supabase = createClient();

  const { data: topic } = await supabase
    .from('topics')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'active')
    .maybeSingle();

  if (!topic) notFound();

  const { data: notes } = await supabase
    .from('notes')
    .select('*, author:profiles(*), cat:cats(*)')
    .eq('topic_id', topic.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(12);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* 话题头图 */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-stone-200/60 bg-white shadow-card">
        <div className="relative h-36 w-full bg-gradient-to-r from-brand-400 via-orange-300 to-amber-200 sm:h-48">
          {topic.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={topic.cover_url} alt={topic.name} className="h-full w-full object-cover" />
          ) : (
            <span className="pointer-events-none absolute bottom-2 right-6 select-none text-7xl opacity-40">
              🐾
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <h1 className="absolute bottom-4 left-6 text-2xl font-bold text-white drop-shadow sm:text-3xl">
            # {topic.name}
          </h1>
        </div>
        {topic.description && (
          <p className="px-6 py-4 text-sm leading-relaxed text-stone-500">{topic.description}</p>
        )}
      </div>

      <Waterfall
        initialNotes={(notes ?? []) as Note[]}
        staticMode
        emptyTitle="这个话题还没有内容"
        emptyDescription="快去发布一条吧"
      />
    </div>
  );
}
