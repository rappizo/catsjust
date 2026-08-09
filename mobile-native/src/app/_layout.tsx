import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { UnreadProvider } from '@/features/messages/UnreadProvider';
import { AppUpdateChecker } from '@/components/AppUpdateChecker';
import { colors } from '@/core/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  // 推送点击深链：私信 → 聊天室；其他通知 → 消息中心
  // 动态加载 expo-notifications，避免启动时初始化原生模块（部分设备崩溃）
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        if (disposed) return;
        const sub = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
          const type = data.type;
          if (type === 'dm' && typeof data.conversationId === 'string') {
            router.push(`/messages/${data.conversationId}`);
          } else {
            router.push('/(tabs)/messages');
          }
        });
        cleanupRef.current = () => sub.remove();
      } catch {
        /* 通知模块不可用则忽略（不影响启动） */
      }
    })();
    return () => {
      disposed = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UnreadProvider>
            <StatusBar style="light" backgroundColor={colors.bg} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="login" options={{ presentation: 'modal' }} />
              <Stack.Screen name="note/[id]" />
              <Stack.Screen name="messages/[id]" />
            </Stack>
            <AppUpdateChecker />
          </UnreadProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
