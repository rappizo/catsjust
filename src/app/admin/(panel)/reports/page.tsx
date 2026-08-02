import { createAdminClient } from '@/lib/supabase/admin';
import { ReportsView, type ReportRow } from '@/components/admin/ReportsView';

export const metadata = {
  title: '举报处理',
};

/** 兼容 author 可能是对象或数组的返回 */
function pick<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function AdminReportsPage() {
  const admin = createAdminClient();

  const { data: reports } = await admin
    .from('reports')
    .select(
      '*, reporter:profiles!reporter_id(id, username, nickname, avatar_url), target_user:profiles!target_user_id(id, username, nickname, status)'
    )
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = (reports ?? []) as any[];

  // 批量拉取被举报的笔记 / 评论（避免 N+1）
  const noteIds = Array.from(new Set(rows.map((r) => r.note_id).filter(Boolean))) as string[];
  const commentIds = Array.from(new Set(rows.map((r) => r.comment_id).filter(Boolean))) as string[];

  const [notesRes, commentsRes] = await Promise.all([
    noteIds.length
      ? admin
          .from('notes')
          .select('id, title, cover_url, media_type, status, author_id, author:profiles!notes_author_id_fkey(id, username, nickname)')
          .in('id', noteIds)
      : Promise.resolve({ data: [] as any[] }),
    commentIds.length
      ? admin
          .from('comments')
          .select('id, content, user_id, author:profiles!comments_user_id_fkey(id, username, nickname)')
          .in('id', commentIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const noteMap = new Map((notesRes.data ?? []).map((n) => [n.id, n]));
  const commentMap = new Map((commentsRes.data ?? []).map((c) => [c.id, c]));

  const merged: ReportRow[] = rows.map((r) => ({
    id: r.id,
    reporter_id: r.reporter_id,
    note_id: r.note_id,
    comment_id: r.comment_id,
    target_user_id: r.target_user_id,
    reason: r.reason,
    detail: r.detail,
    status: r.status,
    resolution: r.resolution,
    handled_at: r.handled_at,
    created_at: r.created_at,
    reporter: pick(r.reporter),
    target_user: pick(r.target_user),
    note: r.note_id && noteMap.get(r.note_id)
      ? {
          id: noteMap.get(r.note_id).id,
          title: noteMap.get(r.note_id).title,
          cover_url: noteMap.get(r.note_id).cover_url,
          media_type: noteMap.get(r.note_id).media_type,
          status: noteMap.get(r.note_id).status,
          author_id: noteMap.get(r.note_id).author_id,
          author: pick(noteMap.get(r.note_id).author),
        }
      : null,
    comment: r.comment_id && commentMap.get(r.comment_id)
      ? {
          id: commentMap.get(r.comment_id).id,
          content: commentMap.get(r.comment_id).content,
          user_id: commentMap.get(r.comment_id).user_id,
          author: pick(commentMap.get(r.comment_id).author),
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">举报处理</h1>
        <p className="mt-0.5 text-sm text-stone-400">
          用户举报工单：删除内容 / 封禁用户 / 驳回举报
        </p>
      </div>
      <ReportsView initialReports={merged} />
    </div>
  );
}
