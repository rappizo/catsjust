import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomTabBar } from '@/components/BottomTabBar';
import { RealtimeUnreadSync } from '@/components/RealtimeUnreadSync';
import { AppUpdateChecker } from '@/components/AppUpdateChecker';
import { ErrorLogger } from '@/components/ErrorLogger';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';

/** 前台站点布局：导航 + 内容 + 页脚 + 底部 Tab 栏（App 骨架） */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  let username: string | null = null;
  let notifUnread = 0;
  let dmUnread = 0;
  let userId: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
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
      notifUnread = unreadRes.count ?? 0;
      dmUnread = dmUnreadRes.count ?? 0;
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20">{children}</main>
      <Footer />
      {userId ? (
        <RealtimeUnreadSync
          username={username}
          initialNotifUnread={notifUnread}
          initialDmUnread={dmUnread}
          userId={userId}
        />
      ) : (
        <BottomTabBar username={username} unreadCount={0} />
      )}
      <AppUpdateChecker />
      <ErrorLogger />
    </div>
  );
}
