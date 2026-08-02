import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomTabBar } from '@/components/BottomTabBar';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';

/** 前台站点布局：导航 + 内容 + 页脚 + 底部 Tab 栏（App 骨架） */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  let username: string | null = null;
  let unreadCount = 0;

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const [profileRes, unreadRes, dmUnreadRes] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', user.id).maybeSingle(),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false),
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .or(`and(user_a.eq.${user.id},unread_a.gt.0),and(user_b.eq.${user.id},unread_b.gt.0)`),
      ]);
      username = profileRes.data?.username ?? null;
      // 消息未读 = 通知未读 + 私信未读
      unreadCount = (unreadRes.count ?? 0) + (dmUnreadRes.count ?? 0);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20">{children}</main>
      <Footer />
      <BottomTabBar username={username} unreadCount={unreadCount} />
    </div>
  );
}
