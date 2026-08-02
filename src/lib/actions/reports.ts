'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { REPORT_REASONS } from '@/lib/constants';

export type ReportResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * 提交举报（笔记 / 评论 / 用户）。
 * RLS：仅登录用户可提交，且 reporter_id 必须为当前用户。
 */
export async function createReport(input: {
  reason: string;
  detail?: string;
  noteId?: string | null;
  commentId?: string | null;
  targetUserId?: string | null;
}): Promise<ReportResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: '服务未配置' };

  const reason = input.reason?.trim();
  if (!reason) return { ok: false, error: '请选择举报原因' };
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) {
    return { ok: false, error: '举报原因不合法' };
  }
  if (!input.noteId && !input.commentId && !input.targetUserId) {
    return { ok: false, error: '缺少举报对象' };
  }

  const detail = input.detail?.trim() || null;
  if (detail && detail.length > 500) {
    return { ok: false, error: '补充说明最多 500 字' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录后再举报' };

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    note_id: input.noteId || null,
    comment_id: input.commentId || null,
    target_user_id: input.targetUserId || null,
    reason,
    detail,
  });

  if (error) return { ok: false, error: `举报失败：${error.message}` };

  if (input.noteId) revalidatePath(`/notes/${input.noteId}`);
  return { ok: true, message: '举报已提交，感谢你的反馈，我们会尽快处理' };
}
