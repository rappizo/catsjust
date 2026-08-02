import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata = {
  title: '管理后台',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    redirect('/');
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, nickname, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  return (
    <AdminShell nickname={profile.nickname || '管理员'} avatar={profile.avatar_url}>
      {children}
    </AdminShell>
  );
}
