import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getSupabase } from '@/core/supabase';

// 前台收到通知时也显示横幅
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * 注册推送 token：
 * 1) 请求系统通知权限
 * 2) 获取 Expo Push Token（需 EAS projectId；无则跳过，优雅降级）
 * 3) 存入 push_tokens 表（RLS 本人；同 token 换账号则更新归属）
 */
export async function registerPushToken(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== 'granted') return;
    }

    // Expo Go / 开发环境可能没有 EAS projectId → 跳过（不阻塞登录）
    const projectId = Constants.easConfig?.projectId;
    if (!projectId) return;

    const token = await Notifications.getExpoPushTokenAsync({ projectId });

    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('expo_token', token.data)
      .maybeSingle();
    if (existing) {
      await supabase
        .from('push_tokens')
        .update({ user_id: user.id, platform: Platform.OS, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('push_tokens')
        .insert({ user_id: user.id, expo_token: token.data, platform: Platform.OS });
    }
  } catch {
    // 注册失败静默，不影响主流程
  }
}

/** 登出时删除该用户的推送 token（简化：删全部；多设备场景后续按设备粒度优化） */
export async function unregisterPushToken(): Promise<void> {
  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('user_id', user.id);
    if (tokens?.length) {
      await supabase
        .from('push_tokens')
        .delete()
        .in(
          'id',
          tokens.map((t) => t.id)
        );
    }
  } catch {
    /* ignore */
  }
}
