# 只有猫 · 原生 App（React Native + Expo）

> N0 基础工程：Expo 初始化 + 主题 + Supabase 客户端 + 认证 + 底部 Tab 骨架 + 首页瀑布流。

## 快速开始

```bash
cd mobile-native
npm install
npx expo start          # 启动开发服务器（手机装 Expo Go 扫码，或按 a 开 Android 模拟器）
```

## 目录结构

```
src/
├─ app/                  expo-router 路由（(tabs) 底部 Tab + login）
├─ core/                 主题 token、Supabase 客户端、类型、常量、媒体 URL
├─ components/           跨域组件（NoteCard 等）
└─ features/             业务域（auth 认证、feed 信息流）
```

## 环境变量

复制 `.env.example` 为 `.env`（已 gitignore）。Expo 只暴露 `EXPO_PUBLIC_` 前缀变量给客户端。

## 常用命令

- `npm run typecheck` — TypeScript 类型检查
- `npm start` — 启动 Metro
- `npm run android` — 启动并打开 Android

## 与 Web 端的对应关系

| Web（src/） | 原生（src/） | 说明 |
|---|---|---|
| `tailwind.config.ts` 颜色 | `core/theme.ts` | 深色霓虹主题 token |
| `lib/supabase/client.ts` | `core/supabase.ts` | supabase-js + AsyncStorage 持久化 session |
| `lib/types.ts` | `core/types.ts` | Note/Profile/Cat/Topic 类型（镜像） |
| `lib/noteRelations.ts` | `features/feed/attachRelations.ts` | recommend_notes 裸笔记补关联 |
| `app/(site)/page.tsx` + `/api/notes` | `features/feed/api.ts` | 首页流：推荐 RPC / 热度 / 关注 |
| `components/Waterfall.tsx` | `features/feed/FeedScreen.tsx` | 瀑布流（MasonryFlashList） |
| `lib/actions/auth.ts` | `features/auth/api.ts` | 登录/注册/封禁校验 |

> ⚠️ session 存储用 AsyncStorage 而非 SecureStore：Supabase session（JWT+refresh token+user）可能超过 SecureStore 的 2KB 限制；N3 再引入更严格的安全存储策略。
