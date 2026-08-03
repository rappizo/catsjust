/**
 * 客户端视频压缩：超过阈值的大视频在浏览器端转码压缩后再上传。
 *
 * 目的：
 * - 允许手机大视频成功上传（原生视频常 >100MB）；
 * - 压缩后体积大幅下降（1080p + H.264 CRF28，通常只有原体积的 1/5~1/10），
 *   降低服务器存储与带宽压力。
 *
 * 实现：
 * - 使用自研 FFmpegClient（classic worker 加载 @ffmpeg/core 的 ESM 构建），
 *   完全绕开 @ffmpeg/ffmpeg 与 Next.js webpack 打包的冲突；
 * - 首次压缩才加载 ~31MB wasm（浏览器缓存），小视频不加载、直接上传；
 * - 转码失败 / 未变小则回退原视频上传（由上层大小上限兜底）。
 */

import { FFmpegClient } from './ffmpegClient';

/** 超过该大小（40MB）的视频在客户端自动压缩 */
export const VIDEO_COMPRESS_THRESHOLD = 40 * 1024 * 1024; // 40MB

let clientPromise: Promise<FFmpegClient> | null = null;

async function getClient(): Promise<FFmpegClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = new FFmpegClient();
      const base = `${window.location.origin}/ffmpeg`;
      await client.load(`${base}/ffmpeg-core.js`, `${base}/ffmpeg-core.wasm`);
      return client;
    })().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

/**
 * 若视频超过阈值则转码压缩后返回新 File，否则原样返回。
 * @param onProgress 压缩进度回调（0-100）
 */
export async function compressVideoFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<File> {
  if (file.size <= VIDEO_COMPRESS_THRESHOLD) return file;
  try {
    const client = await getClient();
    client.onProgress(onProgress ?? null);

    await client.writeFile('input', new Uint8Array(await file.arrayBuffer()));
    await client.exec([
      '-i', 'input',
      // 限制最长边 1080p，保持宽高比（-2 保证偶数）
      '-vf', "scale='min(1920,iw)':-2",
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y', 'output.mp4',
    ]);
    const data = await client.readFile('output.mp4');
    await client.deleteFile('input');
    await client.deleteFile('output.mp4');

    const arr = new Uint8Array(data);
    const blob = new Blob([arr], { type: 'video/mp4' });
    // 压缩后没有变小（异常）则使用原视频
    if (blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.mp4';
    return new File([blob], name, { type: 'video/mp4' });
  } catch (err) {
    console.error('[videoCompress] compress failed:', err);
    return file;
  }
}
