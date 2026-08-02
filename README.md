# 🐱 喵岛 · Cat Island

> 只属于猫咪的内容分享社区 —— 专为猫咪展示的「小红书」。
> 纯展示 · 无商业 · 垂直专业。P1：中文框架。

## 技术架构

```
GitHub（代码托管）
   └── Next.js 14 (App Router) + TypeScript + Tailwind CSS
         ├── 前台 Web（src/app/(site)）
         ├── 管理后台（src/app/admin）
         └── Server Actions + Route Handlers
              └── Supabase（Vercel 生态）
                    ├── Auth        邮箱+密码、JWT 会话
                    ├── Postgres    数据表 + RLS 行级安全 + 触发器
                    └── Storage     图片/视频/头像对象存储
                          └── 部署在 Vercel（自动构建 + CDN）
```

- **认证**：Supabase Auth（邮箱 + 密码），`@supabase/ssr` 管理会话 Cookie
- **数据安全**：PostgreSQL RLS 策略 + `is_admin()` 函数，前端永不直连敏感操作
- **先审后发**：内容默认 `pending`，后台审核通过后 `published` 才公开
- **存储**：图片/视频直传 Supabase Storage（`media`/`avatars` 桶）

## 目录结构

```
├── supabase/migrations/0001_init.sql   # 数据库结构（表/RLS/触发器/存储/种子话题）
├── src/
│   ├── app/
│   │   ├── (site)/                     # 前台页面
│   │   │   ├── page.tsx                # 首页（瀑布流）
│   │   │   ├── notes/[id]/page.tsx     # 笔记详情（点赞/收藏/评论）
│   │   │   ├── publish/page.tsx        # 发布（图文/视频）
│   │   │   ├── login|register/         # 登录 / 注册
│   │   │   ├── profile/[username]/     # 用户主页
│   │   │   ├── cats/[id]/page.tsx      # 猫咪档案主页（垂直差异化）
│   │   │   ├── topics/                 # 话题广场 + 话题页
│   │   │   └── settings/page.tsx       # 个人设置
│   │   ├── admin/                      # 管理后台（仪表盘/审核/用户/话题）
│   │   └── api/notes/route.ts          # 瀑布流游标分页接口
│   ├── components/                     # 组件（瀑布流/轮播/评论/发布表单等）
│   ├── lib/
│   │   ├── supabase/                   # client / server / admin 三端客户端
│   │   ├── actions/                    # Server Actions（auth/notes/cats/admin）
│   │   ├── types.ts / utils.ts / constants.ts / storage.ts
│   └── middleware.ts                   # 会话刷新
├── docs/                               # 产品规划 + P1–P3 分阶段规划
```

## 本地开发

### 1. 创建 Supabase 项目

1. 到 [supabase.com](https://supabase.com) 创建项目；
2. 打开 **SQL Editor**，把 [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) 全部粘贴执行；
3. （可选）到 **Storage** 确认已自动创建 `media`、`avatars` 桶。

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local`，填入：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的 publishable 公钥   # 新版命名，旧称 anon public key
SUPABASE_SECRET_KEY=你的 secret 密钥                        # 新版命名，旧称 service_role，仅后台用户管理读邮箱用，可暂不填
```

> 密钥在 Supabase 控制台 → Settings → API 中获取（新版为 `sb_publishable_*` / `sb_secret_*`）。

### 3. 安装并启动

```bash
npm install
npm run dev
```

访问 http://localhost:3000

### 4. 创建管理员

1. 在网站 `/register` 注册一个普通账号；
2. 在 Supabase 控制台 **SQL Editor** 执行（把 `你的邮箱` 换成你的邮箱）：

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = '你的邮箱' limit 1);
```

3. 重新登录后，右上角头像菜单会出现「管理后台」。

## 上线部署（GitHub + Vercel）

1. **GitHub**：把本项目推送到 GitHub 仓库；
2. **Vercel**：[vercel.com](https://vercel.com) → New Project → 导入该仓库；
3. 在 Vercel 项目设置 → **Environment Variables** 中配置上面 3 个环境变量；
4. 部署后每次 `git push` 自动构建上线；
5. （可选）在 Supabase 中开启备份、设置自定义域名。

## P1 功能清单（当前已实现）

**前台**
- ✅ 邮箱+密码 注册/登录、JWT 会话、退出、个人资料编辑（昵称/头像/封面/简介）
- ✅ 发布图文笔记（多图、拖拽排序、封面）、视频笔记（自动生成封面帧）
- ✅ 发布时关联/创建「猫咪档案」（品种/性别/生日/性格标签/简介）、选择话题
- ✅ 首页双列瀑布流 + 无限滚动（游标分页）
- ✅ 笔记详情：图片轮播 / 视频播放、点赞（**游客免登录**）、收藏（需登录）、分享复制链接、评论（需登录）
- ✅ 用户主页、猫咪档案主页、话题广场/话题页
- ✅ 先审后发：新内容待审核，作者可见审核状态与驳回原因

**后台**（`/admin`，仅管理员）
- ✅ 仪表盘：用户数、待审数、发布数、今日数据、点赞总数
- ✅ 内容审核：待审队列、通过/驳回（附原因）、已处理记录
- ✅ 用户管理：列表、邮箱、封禁/解封
- ✅ 话题管理：新建/编辑/隐藏

## 数据库要点

- **RLS 行级安全**：`notes` 公开内容人人可读，作者可见自己的（含待审），管理员可见全部；作者编辑只能保持 `pending/rejected`，防止绕过审核；
- **计数器触发器**：点赞/收藏/评论数量由数据库触发器自动维护；
- **注册触发器**：`auth.users` 新增时自动创建 `profiles`；
- **多语言预留**：`notes` 已预留 JSONB 字段结构（P3 翻译缓存），建表即考虑未来扩展。

## 下一步（P2）

关注/粉丝、通知中心（WebSocket）、搜索、收藏夹、楼中楼评论、举报处理、数据统计、热度推荐 —— 详见 [`docs/02-分阶段规划-P1-P3.md`](docs/02-分阶段规划-P1-P3.md)。
