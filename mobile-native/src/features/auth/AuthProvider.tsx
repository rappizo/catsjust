import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from '@/core/supabase';
import { registerPushToken, unregisterPushToken } from '@/features/push';
import type { Profile } from '@/core/types';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  /** 首次 session 恢复是否完成（完成前不渲染守卫，避免闪烁跳转） */
  initialized: boolean;
  /** 重新拉取当前用户资料（设置页保存后调用） */
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  initialized: false,
  refreshProfile: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

/** 恢复持久化 session + 监听 auth 状态变化，维护当前 user / profile */
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initialized, setInitialized] = useState(false);

  const loadProfile = useCallback(async (uid: string) => {
    const supabase = getSupabase();
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  const refreshProfile = useCallback(() => {
    if (user) void loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    const supabase = getSupabase();
    let mounted = true;

    const applyUser = (u: User | null) => {
      setUser(u);
      if (u) {
        void loadProfile(u.id);
      } else {
        setProfile(null);
      }
    };

    // 启动时恢复 session（AsyncStorage 持久化）
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      applyUser(data.session?.user ?? null);
      setInitialized(true);
    });

    // 登录/登出/token 刷新时同步
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 登录后注册推送 token / 登出后卸载（N3 原生推送）
  useEffect(() => {
    if (user) void registerPushToken();
    else void unregisterPushToken();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ user, profile, initialized, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
