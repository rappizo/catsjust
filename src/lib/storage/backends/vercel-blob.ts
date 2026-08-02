import type { StorageBackend } from '../types';

/**
 * Vercel Blob 后端（预留，未启用）。
 *
 * 何时启用：想与 Vercel 部署同栈、以图片为主、并接受按量计费。
 *
 * 迁移步骤：
 *   1) npm i @vercel/blob
 *   2) 配置环境变量 BLOB_READ_WRITE_TOKEN（Vercel 控制台 / .env.local）
 *   3) 设置 NEXT_PUBLIC_STORAGE_BACKEND=vercel-blob
 *
 * 注意：BLOB_READ_WRITE_TOKEN 是服务端密钥，不能暴露到浏览器。
 * 当前上传发生在客户端（直接调用门面函数），因此真实迁移时需先打通上传通道：
 *   - 方案 A（简单）：新增 /api/storage 路由，服务端用 @vercel/blob 的 put()
 *     接收文件后上传；本后端的 put() 改为 fetch 该路由。
 *   - 方案 B（推荐，避免占用 Vercel 带宽）：使用 @vercel/blob 客户端 SDK
 *     （createUploadToken 等）做签名直传。
 * 完成通道后，仅需把下方 put() 的实现替换为调用该通道，调用方无需任何改动。
 */
export function createVercelBlobBackend(): StorageBackend {
  return {
    name: 'vercel-blob',
    async put() {
      throw new Error(
        'STORAGE_BACKEND=vercel-blob 尚未启用：请先安装 @vercel/blob 并配置 BLOB_READ_WRITE_TOKEN，再按本文件头部注释实现 put()'
      );
    },
  };
}
