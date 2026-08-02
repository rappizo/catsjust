import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';

export const metadata = { title: '我的主页' };

/** 「我」入口：跳转到当前登录用户的个人主页 */
export default async function MePage() {
  if (!isSupabaseConfigured()) redirect('/login?next=/me');

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/me');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.username) redirect('/settings');

  redirect(`/profile/${profile.username}`);
}
