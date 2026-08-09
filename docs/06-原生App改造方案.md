# 06 · 原生 App 改造方案（告别套壳）

> 最后更新：2026-08-06
> 背景：现 App 为 Capacitor WebView 套壳（`mobile/` 加载 `https://www.catsjust.com`）。用户在其他项目体验过真原生 App 后，明确要求按原生方式重做。
> 本文给出：技术选型 → 架构设计 → 原生能力清单 → 分阶段路线 → 共存与上架策略。

---

## 0. TL;DR（一页结论）

| 项 | 结论 |
|---|---|
| 现状 | Next.js Web + Capacitor 套壳（WebView 加载线上站点），Android/iOS 均已封装 |
| 问题 | WebView 体验与原生差距大：视频、列表滚动、无原生推送、启动慢、内存/发热、返回手势（此前已踩 3 次坑） |
| 方案 | **React Native + Expo 原生重写移动端**，保留现有 Web（桌面 + 后台），共享 Supabase 后端 |
| 周期 | 约 3 个月（1 人全职），分 N0–N4 五个阶段 |
| 关键动作 | ① 后端「API 化」补一层 REST 接口；② 原生播放器解决视频（此前根因是 WebView 合成 + 国内网络）；③ 接入原生推送（FCM/APNs，WebView 做不到） |
| 上线 | 双端并行 → 原生 v1.0 正式版 → 逐步下线套壳 APK |

---

## 1. 现状与差距（为什么套壳永远追不上原生）

以下问题在本项目已**实际发生**（见仓库记忆），全部是 WebView 架构的固有缺陷：

| # | 体验点 | 套壳现状（已踩坑） | 原生方案 |
|---|---|---|---|
| 1 | **视频播放** | Chromium 合成层 bug 导致画面不渲染（fadeInUp transform）；CF 对大陆流媒体限速视频空白；WebView 解码器兼容差 | ExoPlayer（Android）/ AVPlayer（iOS）硬解；本地/边缘缓存；国内 CDN 分流域可解 |
| 2 | **原生推送** | WebView **完全做不到**：私信/点赞/评论/审核结果只能 App 内看，杀进程后收不到 | FCM + APNs + 国内厂商通道；通知点击深链直达 |
| 3 | **列表滚动** | 瀑布流 DOM 渲染，长列表 GC 卡顿 | FlashList 原生复用 + 惰性加载，60fps |
| 4 | **启动速度** | 冷启动先起 WebView 再加载整站（HTML/JS/图片），1.5–3s+ | 原生壳 <1s，首屏本地渲染 |
| 5 | **内存/发热** | 常驻 WebView + 站点 JS 引擎 + 图片解码，发热耗电 | 原生列表/图片解码器效率高 3–5 倍 |
| 6 | **返回手势** | Android 13+ 预测性返回绕过回调（右滑直接退出 App），已修 2 次 | 原生 `Navigation` 栈原生手势，系统级一致 |
| 7 | **系统集成** | 无法拍照唤起、无触感、无分享面板、无深链 | 原生相机/相册/分享/触感/深链全支持 |
| 8 | **离线** | 完全依赖网络，弱网/无网白屏 | SQLite 缓存 + 草稿本地保存 + 骨架占位 |
| 9 | **后台** | 杀进程即断连，Realtime 失效 | 推送兜底 + 系统任务后台同步 |
| 10 | **发布体验** | ffmpeg.wasm 在手机端内存受限（>300MB 视频可能 OOM）；选图/预览卡顿 | 原生相机拍摄、系统相册多选、原生转码压缩 |

> 一句话：**WebView 是"浏览器里跑网页"，原生是"系统级 App"**。对本 App 内容形态（瀑布流 + 视频 + 私信 + 通知）而言，原生是唯一正解。

---

## 2. 技术选型

### 2.1 三条路线对比

| 方案 | 学习成本 | 原生体验 | 一套代码双端 | 生态/招人 | 与现有代码复用 | 结论 |
|---|---|---|---|---|---|---|
| **React Native + Expo** | **低**（已是 React/TS 团队） | ★★★★☆（90%+ 原生） | ✅ | 最大（Expo 插件体系） | 类型定义、业务逻辑、Supabase 调用 | ✅ **推荐** |
| Flutter | 中高（学 Dart） | ★★★★★ | ✅ | 优秀 | 几乎无（Dart 重写） | 备选，若追求极限性能 |
| Swift + Kotlin 双原生 | 高（两套） | ★★★★★ | ❌（两套代码） | 各平台 | 几乎无 | 成本 2x，不划算 |

### 2.2 推荐：React Native + Expo —— 理由

1. **团队零迁移成本**：现有代码全是 React + TypeScript + Tailwind 设计 token，心智模型一致（`expo-router` 文件路由 ≈ Next.js App Router）；
2. **后端直接复用**：Supabase JS SDK 在 RN 开箱即用，现有 RLS 策略、RPC（`recommend_notes`、`has_sensitive_word` 等）、Realtime（私信/通知）原样可用；
3. **原生体验达标**：reanimated + gesture-handler + FlashList + react-native-video（ExoPlayer/AVPlayer 硬解）足以达到用户感知的原生水平；
4. **生态最全**：相机、相册、推送、深链、SecureStore、Sentry、国内推送厂商 SDK 都有成熟 Expo 模块。

### 2.3 核心技术栈清单

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | Expo SDK 53 + React Native 0.7x + TypeScript | 稳定长期版 |
| 路由 | expo-router（Stack + Tabs） | 文件式路由，原生转场 + 侧滑返回 + Android 预测性返回 |
| 状态 | zustand（全局）+ TanStack Query（服务端缓存）+ MMKV/SQLite（离线） | 认证态/会话/角标用 zustand；列表/详情用 Query 缓存 |
| 网络 | supabase-js（auth/RLS/Realtime/RPC）+ fetch 封装 | 直连 Supabase + 自有 API |
| 列表 | FlashList（瀑布流用 2 列变体） | 原生复用、惯性滚动 |
| 动画/手势 | react-native-reanimated + gesture-handler | 详情页转场、点赞动效、左右滑图 |
| 视频 | react-native-video（ExoPlayer / AVPlayer） | 硬解、自动播放、全屏 |
| 图片 | expo-image（磁盘缓存 + 渐进加载） | 替代 `_next/image` 优化链路 |
| 相机/相册 | expo-camera + expo-image-picker + expo-media-library | 拍摄、多选、Live Photo |
| 压缩 | react-native-image-resizer + 原生转码（iOS AVAssetExportSession / Android ffmpeg-kit） | 替代浏览器 ffmpeg.wasm |
| 推送 | expo-notifications + FCM/APNs（国内叠加厂商通道） | 见 §4.2 |
| 安全存储 | expo-secure-store（Keychain/Keystore） | 存 Supabase session |
| 深链 | expo-linking（catsjust:// + universal links） | 通知/分享直达 |
| 监控 | Sentry（原生 + JS） | 崩溃上报 |

---

## 3. 架构设计

### 3.1 后端复用策略（⚠️ 最关键的工程决策）

**现状**：Web 端业务逻辑在 Next.js **Server Actions** 里（`src/app/.../actions.ts`），用 service_role 绕过 RLS 执行审核、敏感词、发布等操作。**原生 App 无法调用 Server Actions**。

**方案**：三层复用，按能力边界划分：

```
原生 App
   │
   ├─ ① 直连 Supabase（RLS 已完备的部分）── 读流、点赞、评论、关注、
   │    私信、通知、猫咪档案、搜索（走 PostgREST + RPC + Realtime）
   │
   ├─ ② 自有 API（Next.js Route Handler /api/v1/*）── 需要 service_role 或
   │    复杂业务校验的部分：发布/编辑笔记（敏感词+审核入队）、举报、
   │    修改密码、封禁态校验、上传凭证等
   │
   └─ ③ Supabase Edge Function（推送）── 触发私信/点赞/评论/审核结果推送
```

**② API 化清单**（把现有 server action 逻辑抽成 `/api/v1/*`，Web 端可继续用 action，接口逻辑共用）：

| 接口 | 对应现有逻辑 | 说明 |
|---|---|---|
| `POST /api/v1/notes` | `createNote`/`editNote` | 敏感词校验 + AI 审核入队 + 存储校验 |
| `DELETE /api/v1/notes/:id` | `deleteNote` | 级联清理 |
| `POST /api/v1/reports` | `createReport` | 举报入队 |
| `POST /api/v1/auth/change-password` | `changePassword` | 密码修改 |
| `POST /api/v1/upload/token` | 上传相关 | 可选：客户端直传 Storage 已够则跳过 |
| 其余 | — | 直连 Supabase（①），**尽量不新增接口** |

> **原则：能走 RLS 的绝不加 API**，避免重复造轮子。发布/审核这类"写库+服务端校验"的才走 API。

### 3.2 App 端分层

```
src/
├─ app/            expo-router 路由（tabs: 首页/猫咪/发布/消息/我 + stack 各页）
├─ features/       按业务域聚合（feed / notes / publish / cats / profile /
│                  messages / notifications / search / settings）
├─ core/           主题 token、API client、认证 store、错误处理、常量
├─ db/             SQLite 表（缓存 + 草稿）
└─ components/     跨域复用组件（NoteCard、MediaCarousel、Avatar、状态条）
```

**导航结构**：沿用已定稿的「上三下五」——底部 Tab（首页/猫咪/➕/消息/我）+ 首页顶部段（关注/发现/选猫），与 L1–L3 设计一致。

### 3.3 数据 / 缓存 / 离线

| 项 | 方案 |
|---|---|
| 认证 | supabase-js auth + session 存 Keychain/Keystore；启动静默恢复 |
| 服务端状态 | TanStack Query：瀑布流分页、详情、评论、会话列表（Realtime 失效时 Query 失效兜底） |
| 离线缓存 | SQLite 缓存首页流 + 笔记详情 + 猫咪档案；弱网优先读缓存再刷新 |
| 草稿 | 发布表单本地自动存 SQLite，杀进程不丢 |
| 全局状态 | zustand：认证态、未读角标（通知 + 私信，对齐 RealtimeUnreadSync 逻辑）、推送 token |

---

## 4. 原生能力落地清单（体验差异的核心）

### 4.1 视频（解决此前 3 次事故）

- `react-native-video` 走 **ExoPlayer/AVPlayer 硬解**，与 WebView 合成彻底无关；
- 直链播放（Supabase）优先 + 失败自动切 `/v/` 代理兜底（复用现有代理）；国内后续走七牛/CDN 分流域；
- 全屏竖屏信息流（VerticalFeed 原生版）、列表自动播放/离屏暂停、进度缓存；
- poster 封面加载走磁盘缓存，弱网先出封面。

### 4.2 推送（WebView 唯一完全做不到的能力）

- **链路**：App 注册 → 拿 device token（FCM/APNs）→ 存 Supabase `push_tokens` 表（RLS 仅本人）→ 业务事件（私信/点赞/评论/关注/审核结果）写 `notifications` 表 → **Supabase Edge Function 触发器**调 FCM/APNs 下发；
- **角标**：App 内 Realtime 实时角标（现有逻辑迁移）+ 推送离线角标双通道；
- **国内送达**：华为/小米/OPPO/vivo 厂商通道（Expo 有 `expo-notifications` 之外的厂商插件，或走 `@notifee` + 厂商 SDK）；
- **深链**：通知点击 → `catsjust://messages` 等直达对应页。

### 4.3 导航 / 手势 / 触感

- 原生 Stack 转场（iOS 侧滑返回、Android 预测性返回——彻底告别此前 onBackPressed 踩坑）；
- 点赞/关注/切换 Tab 触感反馈（`expo-haptics`）；
- 下拉刷新、上拉加载用原生控件（`RefreshControl` / FlashList 分页）。

### 4.4 发布（替换 ffmpeg.wasm）

- 相机拍摄 + 相册多选（`expo-image-picker`），**原生拍摄无 WebView 限制**；
- 图片原生压缩（image-resizer，对齐 Web 端 2048px/0.85 规则）；
- 视频：iOS 用 `AVAssetExportSession`（硬编转 H.264 1080p），Android 用 `ffmpeg-kit` 或直传（>40MB 才转），**不再依赖浏览器 wasm**；
- 上传走 Supabase Storage 直传（RLS），进度条原生。

### 4.5 其他

- 深链 `catsjust://`（分享链接、通知、扫码跳转）；
- 分享面板（系统分享文字/图片，WebView 做不了）；
- 弱网/离线骨架与重试；
- 启动屏 → 首页首帧，无白屏。

---

## 5. 分阶段实施路线（N 系列，约 3 个月）

> 与 P/L 系列并列新命名「N = Native」。每阶段结束均可独立验收、出测试包。

### N0 · 基础工程（1–2 周）
- [ ] Expo 工程初始化（双端），`expo-router` 骨架：底部 Tab + 各 Stack
- [ ] 设计 token 迁移：Tailwind 深色霓虹主题 → RN Theme（品牌绿 `#2eff8c` 对比度规则沿用）
- [ ] API 层：supabase-js 客户端封装 + `/api/v1` 首批接口（发布/举报）
- [ ] 认证：登录/注册/忘记密码 + SecureStore session 恢复
- [ ] 首页瀑布流读取（复用 `recommend_notes` RPC + `attachNoteRelations` 逻辑）
- **验收**：装到真机，能登录、刷首页流、冷启动 <1.5s

### N1 · 浏览闭环（2–3 周）
- [ ] 首页三段：发现（推荐）/关注/选猫
- [ ] 笔记详情：图文轮播（全屏查看器原生版）+ 视频原生播放 + 评论楼中楼 + 点赞/收藏/举报
- [ ] 猫咪广场 + 猫咪档案 + 品种筛选
- [ ] 个人主页（作品/收藏/赞过/评论 + 猫咪 Tab + 关注/粉丝列表）+ 编辑资料
- [ ] 搜索（历史 + 热搜 + 结果流）
- [ ] 深链 + 分享
- **验收**：只读体验（刷、看、搜、进主页）达到"别的项目原生 App"手感

### N2 · 发布闭环（2 周）
- [ ] 发布：拍照/相册多选、图片压缩、封面选择、草稿本地保存
- [ ] 视频：拍摄/选择 + 原生转码压缩 + 上传进度
- [ ] 发布流程：关联猫咪档案、话题、提交审核（走 `/api/v1/notes`）
- [ ] 编辑/删除已发布笔记
- **验收**：发布图文/视频全流程端到端，杀进程草稿不丢

### N3 · 社交闭环（2–3 周）
- [ ] 私信：会话列表 + ChatRoom（Realtime + 已读回执，复用现有表结构与去重逻辑）
- [ ] 消息中心 5 分组 + 未读角标（对齐 RealtimeUnreadSync）
- [ ] 原生推送：FCM/APNs + `push_tokens` 表 + Edge Function 下发 + 通知深链
- [ ] 国内厂商通道（可选，先 APNs/FCM，国内商店版再叠加）
- **验收**：杀进程后收到私信/点赞/评论推送，点击直达

### N4 · 打磨与上架（2–3 周）
- [ ] 动画打磨、空态/骨架、弱网重试
- [ ] 性能：列表帧率、内存、图片缓存 LRU
- [ ] Sentry 崩溃监控 + 版本更新提醒（对齐 AppUpdateChecker）
- [ ] 隐私政策/合规页（复用 `/privacy` 内容）
- [ ] iOS App Store 上架（沿用 05 指南）；Android Play / 国内商店（软著 + 备案 + 签名）
- [ ] 双端并行发布 → 数据看板观察 → 逐步下线套壳 APK
- **验收**：双商店过审，v1.0 正式版

---

## 6. 与 Web 端的关系与共存策略

| 端 | 角色 | 说明 |
|---|---|---|
| **Web（现有 Next.js）** | 保留：桌面浏览 + **后台管理**（审核/用户/统计是 admin 专用，不做 App） | 继续部署 Vercel，与 App 共享后端 |
| **原生 App（新）** | 移动端主入口 | v1.0 起承担移动端全部体验 |
| **套壳 App（旧）** | 过渡期并存 → 下线 | 原生 v1.0 发布后停更，下载页切换 |

- 共享：Supabase（库/存储/RLS/Realtime/RPC）、Vercel 代理（`/v/` 视频、`/apk/`）、Cloudflare；
- Web 端 Server Actions **不动**（不影响现有功能），仅新增 `/api/v1/*` 给 App 用；
- 版本号：App 走独立 `APP_VERSION`（与 Web 解耦），后台统计无影响。

---

## 7. 上架与国内分发

| 渠道 | 前置条件 | 备注 |
|---|---|---|
| iOS App Store | 已有方案（05 指南）：Mac + Xcode + ¥688/年 | 原生版重新走一遍，Bundle ID 可沿用 `com.catsjust.app` |
| Google Play | 开发者账号 $25 | 海外分发（未来多语言开放后可考虑） |
| 国内商店（华为/小米/OPPO/vivo/应用宝） | **软著 + ICP 备案 + 应用签名 + 隐私合规** | 需新增资质，费用与周期另估；社区类 App 关注审核要求 |

> 建议：首期先上 **App Store + Google Play + 官网 APK 直装**（沿用现有下载页模式），国内商店作为 N4 之后的独立工作项。

---

## 8. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| Server Actions 无法被 App 调用 | 发布/审核链路断 | §3.1 的 API 化清单，N0 优先完成发布接口 |
| 原生视频转码工作量（替代 ffmpeg.wasm） | N2 延期 | iOS AVAssetExportSession 现成；Android 先直传（>40MB 走 ffmpeg-kit），后续服务端转码 |
| 国内推送送达率 | 私信/通知体验 | 国内商店版叠加厂商通道；先上 APNs/FCM 保底 |
| 双端并行维护成本 | 人力 | Web 只做后台/桌面；App 承担移动端，职责清晰 |
| 上架审核/资质 | 上架周期 | 提前办软著/备案；先走官网直装分发不阻塞 |
| 学习成本（若选 Flutter） | 周期翻倍 | 选 RN 规避（§2.2） |

---

## 9. 需要你拍板的决策点

1. **技术栈**：React Native + Expo（推荐，团队零迁移）还是 Flutter？
2. **人力**：自己做还是外包/招人？1 人全职约 3 个月。
3. **Web 端去留**：保留（推荐，后台管理还得靠它）还是全迁 App？
4. **国内商店**：是否投入软著 + 备案做国内分发，还是先 App Store + 官网直装？
5. **推送**：先 APNs/FCM 保底，还是直接上国内厂商通道？

---

## 10. 下一步行动（确认后即可开工）

1. 拍板技术栈与人力（§9）→ 2. 搭建 Expo 工程 + 认证 + 首页流（N0）→ 3. 抽 `/api/v1` 发布/举报接口 → 4. 出 N0 测试包真机体验对比 → 5. 继续 N1–N4。

---

## 11. N 阶段实施进度（2026-08-06 更新）

> 工程位于 `mobile-native/`（Expo SDK 53 + expo-router），与套壳 `mobile/` 并存。
> 已拍板：RN + 保留 Web + 自己做。验证命令：`npm run typecheck` + `npx expo export --platform android`。

| 阶段 | 状态 | 说明 |
|---|---|---|
| **N0 基础工程** | ✅ 完成 | Expo 工程 + 深色霓虹主题 + supabase 客户端（AsyncStorage 存 session）+ 认证（登录/注册/封禁拦截）+ 底部 Tab + 首页瀑布流（MasonryFlashList + recommend_notes RPC） |
| **N1 浏览闭环** | ✅ 完成 | 笔记详情（expo-video 原生播放 + 图片轮播/全屏查看器 + 点赞收藏分享 + 楼中楼评论）、猫咪广场（品种筛选 + 热度）、猫咪档案、个人主页（5 Tab + 关注）、关注/粉丝列表、搜索（热搜 + 本地历史）、深链分享 |
| **N2 发布闭环** | ✅ 完成 | Web 端 `/api/v1/notes`（发布/编辑/删除，Bearer token 认证，共享 noteService）+ 原生发布页（相册多选/拍照/视频 + 图片压缩 + 草稿自动保存 + 关联猫咪/话题 + 编辑模式）+ 详情页作者编辑/删除。**视频未做原生转码（Expo Go 限制），直传** |
| **N3 社交闭环** | ✅ 完成 | 私信（ChatRoom Realtime + 乐观去重 + 已读回执 + 轮询兜底）、消息中心 5 分组、全局未读角标（UnreadProvider）、发私信入口、**原生推送**（migration 0020 push_tokens + pg_net 触发器 → Vercel `/api/v1/push` → Expo Push Service） |
| **N4 打磨与上架** | 🔶 进行中 | 已完成：设置页（资料编辑/修改密码/退出）、版本更新提醒、隐私政策/用户协议页、错误重试、通知深链、版本号统一。待办：Sentry 崩溃监控、App 图标/启动屏、EAS 构建、双商店上架 |

**Web 端配套改动**（需部署 Vercel 后 App 功能才完整）：
- `src/lib/noteService.ts`：发布/编辑/删除共享逻辑
- `src/app/api/v1/notes/route.ts` + `[id]/route.ts`：发布/编辑/删除 API（Bearer token 认证）
- `src/app/api/v1/push/route.ts`：推送网关（X-Push-Secret，env `PUSH_SECRET=catsjust_push_secret_2026`）
- `supabase/migrations/0020_push_tokens.sql`：push_tokens 表 + pg_net 推送触发器
- `tsconfig.json` exclude 加了 `mobile-native`

---

## 12. 上架 Checklist（N4 收尾用）

### 12.1 代码/产物准备
- [ ] App 图标 + 启动屏（对齐 Web Logo 风格，`npx expo prebuild` 或 EAS 配置）
- [ ] EAS 项目创建（`eas init`），配置 `extra.eas.projectId`（推送 token 需要）
- [ ] Android 正式签名 keystore + `eas build -p android --profile release` 或 gradle 直出 APK
- [ ] iOS：Mac + Xcode Archive（沿用 `docs/05-iOS上架指南.md`），Bundle ID `com.catsjust.app`
- [ ] 推送：FCM（Android）+ APNs（iOS）证书配置到 EAS 凭据；国内商店版叠加厂商通道
- [ ] Sentry：`@sentry/react-native` 接入（需 DSN）

### 12.2 上架资料
- [ ] 隐私政策/用户协议页已内置（原生 `/privacy` `/terms`）+ App Store Connect 隐私清单
- [ ] 应用名称「只有猫」、描述、截图（深色霓虹风格）
- [ ] iOS 隐私营养标签（收集数据类型声明）
- [ ] 国内商店（如做）：软著 + ICP 备案 + 应用签名 + 隐私合规报告

### 12.3 发布后
- [ ] 双端并行 → 观察后台数据 → 下载页切换为原生版 → 停更套壳 APK
