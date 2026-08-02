import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { SettingsForm } from '@/components/SettingsForm';

export const metadata = {
  title: '个人设置',
};

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) {
    redirect('/login?next=/settings');
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/settings');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, nickname, avatar_url, cover_url, bio, role, status, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) redirect('/login?next=/settings');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">个人设置</h1>
        <p className="mt-1 text-sm text-stone-400">完善你的个人资料</p>
      </div>
      <SettingsForm profile={profile} />
    </div>
  );
}
