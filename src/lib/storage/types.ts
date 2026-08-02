/**
 * 存储抽象层类型定义。
 *
 * 目标：把「上传到哪」从调用方解耦出来。所有调用方只依赖这里的
 * 门面函数（src/lib/storage.ts），后端实现可随时在 supabase /
 * vercel-blob / r2（Cloudflare）之间切换，无需改动调用方。
 */

/** 存储后端标识 */
export type StorageBackendName = 'supabase' | 'vercel-blob' | 'r2';

/** 统一的上传对象描述（与具体后端无关） */
export interface StorageObject {
  /** 目标桶：media = 笔记图片/视频/封面，avatars = 头像 */
  bucket: 'media' | 'avatars';
  /** 逻辑路径，如 `{userId}/images/{uuid}.jpg`（不含桶名） */
  key: string;
  /** 待上传文件 */
  file: File;
  contentType?: string;
  /** 同名覆盖（头像/封面等固定路径用） */
  upsert?: boolean;
}

/**
 * 存储后端契约。
 * 未来接入新后端（Vercel Blob / Cloudflare R2 / AWS S3 …）只需实现本接口，
 * 并在 backends/index.ts 的工厂中注册。
 */
export interface StorageBackend {
  readonly name: StorageBackendName;
  /** 上传对象并返回公开可访问的 URL */
  put(obj: StorageObject): Promise<string>;
  /** 删除对象（预留，后续清理被替换的文件时使用） */
  remove?(keyOrUrl: string): Promise<void>;
}
