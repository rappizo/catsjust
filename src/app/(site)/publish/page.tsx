import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { PublishForm } from '@/components/PublishForm';

export const metadata = {
  title: '发布内容',
};

export default async function PublishPage() {
  // 未配置 Supabase 时无法发布，先引导登录（登录页无需后端）
  if (!isSupabaseConfigured()) {
    redirect('/login?next=/publish');
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/publish');
  }

  const [{ data: cats }, { data: topics }] = await Promise.all([
    supabase
      .from('cats')
      .select('id, name, breed, gender, birthday, personality_tags, avatar_url')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('topics')
      .select('id, name')
      .eq('status', 'active')
      .order('sort_order', { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">发布新内容</h1>
        <p className="mt-1 text-sm text-stone-400">
          发布后将进入审核，通过后公开展示给所有喵友
        </p>
      </div>
      <PublishForm
        userId={user.id}
        initialCats={cats ?? []}
        topics={topics ?? []}
      />
    </div>
  );
}
