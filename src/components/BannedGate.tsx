'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/actions/auth';
import { Loader2 } from 'lucide-react';

/** 已登录用户若被封禁，全屏拦截提示（登录后新会话同样生效） */
export function BannedGate() {
  const [banned, setBanned] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setChecking(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) {
        setBanned(profile?.status === 'banned');
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (checking || !banned) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[#0a0a12] px-6 text-center">
      <span className="text-6xl">🚫</span>
      <h1 className="text-xl font-bold text-ink">账号已被封禁</h1>
      <p className="max-w-sm text-sm leading-relaxed text-stone-400">
        该账号因违反社区规则已被封禁，无法继续使用。如有疑问请联系管理员。
      </p>
      <button
        onClick={async () => {
          await signOut();
        }}
        className="mt-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-2.5 text-sm font-semibold text-[#04281a] shadow-neon-green transition hover:brightness-110"
      >
        {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : '退出登录'}
      </button>
    </div>
  );
}
