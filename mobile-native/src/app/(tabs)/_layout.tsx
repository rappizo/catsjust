import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { useUnread } from '@/features/messages/UnreadProvider';
import { colors } from '@/core/theme';

function tabIcon(icon: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={icon} size={size} color={color} />
  );
}

/**
 * 底部 Tab（上三下五导航骨架）：
 * 首页 / 猫咪 / 发布(＋) / 消息 / 我
 */
export default function TabsLayout() {
  const { user, initialized } = useAuth();
  const { notifUnread, dmUnread } = useUnread();
  const totalUnread = notifUnread + dmUnread;

  // session 恢复完成前不渲染（避免闪跳）
  if (!initialized) return null;
  // 未登录 → 登录页
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.brand[500],
        tabBarInactiveTintColor: colors.inkMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: '首页', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="cats" options={{ title: '猫咪', tabBarIcon: tabIcon('paw') }} />
      <Tabs.Screen
        name="publish"
        options={{ title: '发布', tabBarIcon: tabIcon('add-circle') }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: '消息',
          tabBarIcon: tabIcon('chatbubbles'),
          tabBarBadge:
            totalUnread > 0 ? (totalUnread > 99 ? '99+' : totalUnread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, color: '#fff', fontSize: 10 },
        }}
      />
      <Tabs.Screen name="me" options={{ title: '我', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
