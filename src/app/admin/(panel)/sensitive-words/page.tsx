import { createAdminClient } from '@/lib/supabase/admin';
import { SensitiveWordManager } from '@/components/admin/SensitiveWordManager';

export const metadata = {
  title: '敏感词管理',
};

export default async function AdminSensitiveWordsPage() {
  const admin = createAdminClient();

  const { data: words } = await admin
    .from('sensitive_words')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">敏感词管理</h1>
        <p className="mt-0.5 text-sm text-stone-400">
          命中敏感词的内容会在发布 / 评论时被拦截（当前 {words?.length ?? 0} 个词条）
        </p>
      </div>
      <SensitiveWordManager initialWords={(words ?? []) as any[]} />
    </div>
  );
}
