import { createAdminClient } from '@/lib/supabase/admin';
import { ContentManager, type ContentRow } from '@/components/admin/ContentManager';

export const metadata = {
  title: '内容管理',
};

export default async function AdminContentPage() {
  const admin = createAdminClient();

  const { data: notes } = await admin
    .from('notes')
    .select('id, title, content, cover_url, media_type, status, reject_reason, like_count, comment_count, favorite_count, created_at, author:profiles(nickname, username)')
    .in('status', ['published', 'removed'])
    .order('created_at', { ascending: false })
    .limit(200);

  const rows: ContentRow[] = (notes ?? []).map((n) => {
    const author = Array.isArray(n.author) ? n.author[0] : n.author;
    return {
      id: n.id,
      title: n.title,
      content: n.content,
      cover_url: n.cover_url,
      media_type: n.media_type,
      status: n.status,
      reject_reason: n.reject_reason,
      like_count: n.like_count,
      comment_count: n.comment_count,
      favorite_count: n.favorite_count,
      created_at: n.created_at,
      author: author ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">内容管理</h1>
        <p className="mt-0.5 text-sm text-stone-400">
          已发布 / 已下架内容检索、下架、重新上架、永久删除
        </p>
      </div>
      <ContentManager initialNotes={rows} />
    </div>
  );
}
