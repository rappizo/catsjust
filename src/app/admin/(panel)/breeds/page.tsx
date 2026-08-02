import { createAdminClient } from '@/lib/supabase/admin';
import { BreedManager } from '@/components/admin/BreedManager';

export const metadata = {
  title: '品种管理',
};

export default async function AdminBreedsPage() {
  const admin = createAdminClient();

  const { data: breeds } = await admin
    .from('breeds')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">品种管理</h1>
        <p className="mt-0.5 text-sm text-stone-400">
          猫咪品种词典维护（新增 / 编辑 / 启停用 / 删除）
        </p>
      </div>
      <BreedManager initialBreeds={(breeds ?? []) as any[]} />
    </div>
  );
}
