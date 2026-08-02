import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { NavbarClient } from './NavbarClient';

/** 服务端读取会话与资料，再交给客户端组件渲染 */
export async function Navbar() {
  // Supabase 未配置时按游客渲染
  if (!isSupabaseConfigured()) {
    return <NavbarClient user={null} profile={null} />;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { username: string; nickname: string; avatar_url: string | null; role: string } | null =
    null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, nickname, avatar_url, role')
      .eq('id', user.id)
      .maybeSingle();
    profile = data ?? null;
  }

  return (
    <NavbarClient
      user={
        user
          ? { id: user.id, email: user.email ?? '' }
          : null
      }
      profile={profile}
    />
  );
}
