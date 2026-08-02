import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserActions } from '@/components/admin/UserActions';
import { Avatar } from '@/components/Avatar';
import { formatDate } from '@/lib/utils';
import type { Profile } from '@/lib/types';

export const metadata = {
  title: '用户管理',
};

export default async function AdminUsersPage() {
  const supabase = createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  // 用服务端密钥读取邮箱（仅管理员页面调用）
  let emailMap: Record<string, string> = {};
  try {
    const admin = createAdminClient();
    const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    emailMap = Object.fromEntries(
      (authData?.users ?? []).map((u) => [u.id, u.email ?? ''])
    );
  } catch (e) {
    console.error('读取用户邮箱失败（如未配置 SUPABASE_SECRET_KEY 属正常）:', e);
  }

  const typedProfiles = (profiles ?? []) as Profile[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">用户管理</h1>
        <p className="mt-0.5 text-sm text-stone-400">
          共 {typedProfiles.length} 个用户（展示最近 200 个）
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200/60 bg-white shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-xs text-stone-400">
              <th className="px-5 py-3 font-medium">用户</th>
              <th className="px-4 py-3 font-medium">邮箱</th>
              <th className="px-4 py-3 font-medium">角色</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">注册时间</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {typedProfiles.map((p) => (
              <tr key={p.id} className="transition hover:bg-stone-50/60">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={p.avatar_url} alt={p.nickname || p.username} size="md" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{p.nickname || p.username}</p>
                      <p className="truncate text-xs text-stone-400">@{p.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-500">{emailMap[p.id] || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      p.role === 'admin'
                        ? 'rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600'
                        : 'rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-500'
                    }
                  >
                    {p.role === 'admin' ? '管理员' : '用户'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      p.status === 'active'
                        ? 'rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600'
                        : 'rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-500'
                    }
                  >
                    {p.status === 'active' ? '正常' : '已封禁'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-stone-400">
                  {formatDate(p.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <UserActions
                    userId={p.id}
                    status={p.status}
                    isSelf={p.id === currentUser?.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
