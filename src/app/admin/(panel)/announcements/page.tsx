import { createAdminClient } from '@/lib/supabase/admin';
import { AnnouncementManager, type AnnouncementRow } from '@/components/admin/AnnouncementManager';

export const metadata = {
  title: '公告管理',
};

export default async function AdminAnnouncementsPage() {
  const admin = createAdminClient();
  const { data: announcements } = await admin
    .from('announcements')
    .select('id, title, content, active, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = (announcements ?? []) as AnnouncementRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">公告管理</h1>
        <p className="mt-0.5 text-sm text-stone-400">
          创建/管理站内公告，启用后会展示在首页顶部
        </p>
      </div>
      <AnnouncementManager initialAnnouncements={rows} />
    </div>
  );
}
