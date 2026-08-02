import { createClient } from '@/lib/supabase/server';
import { TopicManager } from '@/components/admin/TopicManager';
import type { Topic } from '@/lib/types';

export const metadata = {
  title: '话题管理',
};

export default async function AdminTopicsPage() {
  const supabase = createClient();

  const { data: topics } = await supabase
    .from('topics')
    .select('*')
    .order('sort_order', { ascending: true })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">话题管理</h1>
        <p className="mt-0.5 text-sm text-stone-400">维护话题与品类，供用户发布时选择</p>
      </div>

      <TopicManager initialTopics={(topics ?? []) as Topic[]} />
    </div>
  );
}
