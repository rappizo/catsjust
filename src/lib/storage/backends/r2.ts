import type { StorageBackend } from '../types';

/**
 * Cloudflare R2 后端（预留，未启用）。
 * 大量图片/视频场景的推荐方案：存储单价低、出站流量免费、可绑自定义域名走 CDN。
 *
 * 迁移步骤：
 *   1) npm i @aws-sdk/client-s3
 *   2) 配置环境变量：
 *      R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
 *      R2_BUCKET / R2_PUBLIC_BASE_URL
 *      （生产建议绑定自定义域名，如 cdn.catsjust.com，走 R2 自带 CDN 分发）
 *   3) 设置 NEXT_PUBLIC_STORAGE_BACKEND=r2
 *
 * 注意：R2 密钥是服务端机密，绝不能暴露到浏览器。
 * 当前上传发生在客户端，真实迁移时应采用「预签名 URL 直传」（视频必须如此，
 * 否则文件会先经过 Vercel 造成巨额带宽费用）：
 *   - 新增 /api/storage/presign 路由：用 S3 CreatePresignedPost 生成一次性
 *     上传凭证（有效期几分钟），浏览器直接 PUT 到 R2，不经 Vercel。
 *   - 本后端的 put() 改为：请求预签名 → 浏览器直传 → 返回公开 URL。
 * 完成通道后仅需替换下方 put() 的实现，调用方无需任何改动。
 */
export function createR2Backend(): StorageBackend {
  return {
    name: 'r2',
    async put() {
      throw new Error(
        'STORAGE_BACKEND=r2 尚未启用：请先安装 @aws-sdk/client-s3 并配置 R2 环境变量，再按本文件头部注释实现 put()'
      );
    },
  };
}
