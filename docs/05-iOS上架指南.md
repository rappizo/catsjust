# iOS 版「只有猫」封装与 App Store 上架指南（中国区 · 免费版）

> 最后更新：2026-08-03 · 对应代码 commit：含 iOS 工程（`mobile/ios/`）

---

## 0. 现状：已经为你准备好的部分 ✅

以下是已在当前仓库完成、无需你重复操作的：

| 项目 | 状态 |
|---|---|
| Capacitor iOS 工程 | ✅ `mobile/ios/`（`App.xcodeproj`，SPM 依赖管理，无需 CocoaPods） |
| iOS 平台依赖 | ✅ `@capacitor/ios@8.5` 已安装 |
| App 名称 / Bundle ID | ✅ `只有猫` / `com.catsjust.app` |
| 图标与启动图 | ✅ 已生成到 `Assets.xcassets`（AppIcon / Splash，含深色模式） |
| 状态栏适配 | ✅ 深色主题：状态栏白字 + `#0a0a12` 背景（`capacitor.config.ts` StatusBar 插件） |
| 刘海屏安全区 | ✅ `viewport-fit=cover` + 站点已用 safe-area 处理底部 |
| 网站指向 | ✅ WebView 加载 `https://www.catsjust.com`，内容实时同步 |

**还差的部分（需要你在 Mac 上做）**：下面第 2~6 步。

---

## 1. 前置条件（必须满足）

1. **一台 Mac**（Apple Silicon 或 Intel 均可），系统建议 macOS 13+。
2. **Xcode**：从 Mac App Store 免费安装（当前推荐 Xcode 16.x）。
3. **Apple 开发者账号**：中国区（`developer.apple.com`），**¥688/年**。
   - ⚠️ 说明：App Store 上架「免费 App」不需要分成，但**注册开发者账号本身需付费**（¥688/年），这不是抽成，是年费。
   - 个人账号即可（个人开发者）。
4. **Apple ID 开启双重认证**（上架必需）。

> ⚠️ iOS 打包**只能在 macOS 上完成**，Windows 无法构建 iOS 包。以下步骤都在 Mac 上执行。

---

## 2. 在 Mac 上准备工程

```bash
# 1) 把项目拉到 Mac（或从 GitHub 克隆）
git clone git@github.com:rappizo/catsjust.git
cd catsjust/mobile

# 2) 安装 Node 依赖（含 @capacitor/ios）
npm install

# 3) 同步一次（确保原生工程与配置一致）
npx cap sync ios
```

> 若 Mac 上 node 版本过旧，先装 Node 18+（`brew install node`）。

---

## 3. 注册 Apple 开发者账号并创建 App ID（约 15 分钟）

1. 打开 https://developer.apple.com/account → 登录 Apple ID → 同意协议 → 选择「个人 / Individual」→ 填写资料并付款（¥688/年，支持支付宝/银联）。
2. 进入 **Certificates, Identifiers & Profiles**（https://developer.apple.com/account/resources/identifiers）：
   - **Identifiers** → 点 `+` → 选 **App IDs** → 类型 **App**：
     - Description：`Catsjust`（或「只有猫」）
     - Bundle ID：`com.catsjust.app`（**必须与工程一致**）
     - Capabilities：默认即可（不需要额外勾选）
     - 保存。
3. 若后续要用推送，再回到这里给该 App ID 勾选 Push Notifications（当前版本暂不需要）。

---

## 4. 在 Xcode 中配置签名并跑通本地（约 20 分钟）

1. 用 Xcode 打开工程：`cd mobile/ios/App && open App.xcodeproj`
   - 首次打开会自动解析 SPM 依赖（`Capacitor` / `CapacitorStatusBar`），等右下角进度条走完。
2. 选中左侧 **App** 项目 → 选择 **App** target → 打开 **Signing & Capabilities**：
   - 勾选 **Automatically manage signing**
   - **Team**：选择你的开发者团队（第 3 步注册后出现在下拉里）
   - 确认 **Bundle Identifier** 显示 `com.catsjust.app`
3. 打开 **General**：
   - **Version**：`0.2.1`（与网站 `APP_VERSION` 一致）
   - **Build**：`1`（每次上传递增）
   - **Minimum Deployments**：iOS 13.0（Capacitor 默认）
   - **Display Name**：`只有猫`
4. 顶部选一台模拟器（如 iPhone 15 Pro）→ 点 ▶ 运行，确认 App 能打开并加载网站。

> 如果 Team 下拉为空：先在 Xcode → Settings → Accounts 里登录你的 Apple ID（App Store Connect 同一个账号）。

---

## 5. 构建并上传到 App Store Connect

### 5.1 打包 Archive

1. Xcode 顶部设备选 **Any iOS Device (arm64)**（不要选模拟器）。
2. 菜单 **Product → Archive**（⌘B 先 Build 一次确保无错）。
3. 等 Archive 完成，打开 **Window → Organizer**，能看到刚打出的包。

### 5.2 上传

1. 在 Organizer 选中该 Archive → 点右侧 **Distribute App**：
   - 选 **App Store Connect** → **Upload**
   - 签名：保持默认（自动）
   - 一路 Next，直到上传完成（几分钟）。
2. 上传成功后会提示，此时可在 App Store Connect 看到构建版本。

> 若上传报错，通常是签名/Team 问题，回第 4 步检查；也可先在 Xcode 里 `Product → Archive` 前用 `Cmd+Shift+B` 确认 Release 构建通过。

---

## 6. 在 App Store Connect 配置上架信息（中国区）

打开 https://appstoreconnect.apple.com → 「我的 App」→ `+` → **新建 App**：

1. **平台**：iOS
2. **名称**：`只有猫`
3. **主要语言**：简体中文
4. **套装 ID（Bundle ID）**：选 `com.catsjust.app`
5. **SKU**：`catsjust`（任意唯一字符串）
6. 创建后进入 App 信息页，逐项填写：

### 必须填写的关键项

| 项目 | 建议内容 |
|---|---|
| 副标题 | 只属于猫咪的分享社区 |
| 隐私政策网址 | `https://www.catsjust.com/privacy`（已有） |
| 支持网址 | `https://www.catsjust.com` |
| 版权 | `2026 只有猫 Catsjust` |
| 类别 | 社交 |
| 年龄分级 | 4+（内容为猫咪分享；如含用户生成内容可选 12+，见审核注意） |

### 截图（必需 5.5" / 6.7" 各一套）

- 在**模拟器**里运行 App，用 `Cmd+S` 截图（需先 `Settings → Developer` 关掉设备边框）。
- 推荐 6 张：首页瀑布流、猫咪广场、发布页、笔记详情、消息中心、个人主页。
- 尺寸：6.7"（iPhone 15 Pro Max）`1290×2796`，5.5"（iPhone 8 Plus）`1242×2208`。

### 版本信息（上传构建后）

- 在「版本」里选择刚上传的构建（若灰色，等 5~10 分钟处理完成）。
- 填写**版本更新说明**：如「v0.2.1：审核结果通知、页面切换性能优化」。

---

## 7. 提交审核

1. 全部信息填完后，点右上角 **「添加以供审核」**。
2. 会弹问卷：
   - 「导出合规性」：未使用加密 → 选「否 / 不适用」。
   - 「广告标识符（IDFA）」：**不**使用广告 → 选「否」。
3. 提交后进入「等待审核」，通常 1~3 天（中国区较快）。

---

## 8. 审核注意事项（重要，避免被拒）

1. **WebView 壳合规（条款 4.2）**：App 是网站封装，需保证：
   - 核心功能完整可用（发布、评论、私信、关注等都有交互，不只是展示）✅
   - 有原生能力（已集成原生状态栏插件、原生 WebView 返回手势）✅
   - 建议在「审核备注 / App Review Notes」里写：*「App 提供完整的猫咪内容社区体验（发布、互动、消息），通过原生 WebView 实时加载网站内容，功能与网站完全一致。」*
2. **用户生成内容（条款 1.2）**：社区 App 需提供：举报功能（已有 `ReportDialog`）✅、审核机制（AI+人工审核）✅、拉黑/屏蔽。建议在隐私政策里说明内容审核机制。
3. **隐私政策**：已提供 `https://www.catsjust.com/privacy`（App Store Connect 里填它）。
4. **登录功能**：App 有登录注册，审核时可提供测试账号（在审核备注里写一个测试账号密码，或说明「用户可自行注册」）。
5. **不要提及测试/演示内容**：App 内若出现明显测试数据会引发审核员质疑，上架前建议清理。

---

## 9. 后续更新（版本升级流程）

每次发新版：
1. 改网站 `src/lib/version.ts` 的 `APP_VERSION` + Android `build.gradle` + iOS Xcode **Version**（Build 递增）。
2. Mac 上重新 `Product → Archive → Distribute → Upload`。
3. App Store Connect 选新构建 → 填更新说明 → 提交审核。
4. 等待审核通过后「发布」。

---

## 10. 常见问题（FAQ）

| 问题 | 解决 |
|---|---|
| Xcode 打开后 SPM 一直转圈 | 检查网络能访问 `github.com`（SPM 拉取依赖）；或 Xcode → File → Packages → Resolve Package Versions |
| Archive 灰色无法点 | 设备没选 **Any iOS Device**，或未 Build 成功 |
| 上传报「No suitable application records」 | 第 6 步的 App 还没在 App Store Connect 创建 |
| 审核被拒 4.2（功能不足） | 按第 8 节准备审核备注，补齐功能与说明后重提 |
| 想先在真机装 | 开发者账号注册后，Xcode 连 iPhone，选自己设备直接 Run（需在设置里信任开发者证书） |
| 首次建议 | 先走 **TestFlight**（App Store Connect → TestFlight → 添加测试员）内测 1~2 天，再正式提交审核 |

---

## 附：本仓库 iOS 相关文件清单

```
mobile/
├── capacitor.config.ts          # 配置（server.url / StatusBar）
├── package.json                 # 含 @capacitor/ios
└── ios/
    ├── App/App.xcodeproj        # Xcode 工程（Mac 上打开这个）
    ├── App/App/                 # 源码 + Assets.xcassets（图标/启动图）
    └── CapApp-SPM/              # SPM 依赖配置
```
