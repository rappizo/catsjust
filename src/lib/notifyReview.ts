import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 审核结果通知：无论通过还是驳回，都向笔记作者写入一条系统通知。
 * 用 service_role 客户端写入（绕过 RLS），与现有通知触发器一致。
 */
export async function notifyReviewResult(
  noteId: string,
  status: 'published' | 'rejected' | 'removed',
  reason?: string | null
): Promise<void> {
  const admin = createAdminClient();
  const { data: note } = await admin
    .from('notes')
    .select('author_id, title')
    .eq('id', noteId)
    .maybeSingle();
  if (!note?.author_id) return;

  const title = note.title || '你的内容';
  let content: string;
  if (status === 'published') {
    content = `🎉 内容已通过审核，现在公开展示：${title}`;
  } else if (status === 'rejected') {
    content = `❌ 内容未通过审核${reason ? `：${reason}` : ''}（${title}）`;
  } else {
    content = `⏸ 内容已被下架：${title}${reason ? `（${reason}）` : ''}`;
  }

  await admin.from('notifications').insert({
    user_id: note.author_id,
    actor_id: null,
    type: 'system',
    note_id: noteId,
    content,
  });
}
