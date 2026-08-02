import { requireAdmin } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';

/** 管理面板分组：所有后台页面必须先通过独立管理员登录 */
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
