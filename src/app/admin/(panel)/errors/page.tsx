import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = {
  title: '错误日志',
};

interface ErrorLogRow {
  id: string;
  message: string;
  stack: string | null;
  url: string | null;
  user_agent: string | null;
  created_at: string;
}

export default async function AdminErrorsPage() {
  const admin = createAdminClient();
  const { data: logs } = await admin
    .from('error_logs')
    .select('id, message, stack, url, user_agent, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = (logs ?? []) as ErrorLogRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">错误日志</h1>
        <p className="mt-0.5 text-sm text-stone-400">
          前端运行时错误上报（最近 100 条，仅记录错误信息/页面/UA，不含用户输入）
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-300 py-16 text-center">
          <span className="text-3xl">🎉</span>
          <p className="font-medium text-stone-500">暂无错误记录</p>
          <p className="text-sm text-stone-400">一切正常</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-stone-100 text-xs text-stone-400">
              <tr>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">错误信息</th>
                <th className="px-4 py-3 font-medium">页面</th>
                <th className="px-4 py-3 font-medium">UA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">
                    {new Date(log.created_at).toLocaleString('zh-CN', { hour12: false })}
                  </td>
                  <td className="max-w-[320px] px-4 py-3">
                    <p className="break-words font-medium text-red-500">{log.message}</p>
                    {log.stack && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
                          查看堆栈
                        </summary>
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-stone-50 p-2 text-[11px] leading-relaxed text-stone-500">
                          {log.stack}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td className="max-w-[220px] break-words px-4 py-3 text-xs text-stone-500">
                    {log.url ?? '-'}
                  </td>
                  <td className="max-w-[180px] break-words px-4 py-3 text-xs text-stone-400">
                    {log.user_agent ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
