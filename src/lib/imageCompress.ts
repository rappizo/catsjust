/**
 * 客户端图片压缩：大于阈值的大图在浏览器端用 canvas 压缩后再上传。
 *
 * 目的：
 * - 允许手机大图（常 >10MB）成功上传；
 * - 压缩后实际存储体积大幅下降（通常 <1.5MB），降低服务器存储与带宽压力。
 *
 * 压缩策略：最长边 ≤2048px + JPEG/WebP 质量 0.85，视觉几乎无损。
 */

/** 超过该大小（2MB）的图片在客户端自动压缩 */
export const IMAGE_COMPRESS_THRESHOLD = 2 * 1024 * 1024;
/** 压缩后最长边（像素）——2048px 对手机/网页浏览足够 */
export const IMAGE_COMPRESS_MAX_DIMENSION = 2048;
/** JPEG/WebP 压缩质量（0-1） */
export const IMAGE_COMPRESS_QUALITY = 0.85;

/**
 * 若图片超过阈值则压缩后返回新 File，否则原样返回。
 * 压缩失败（浏览器不支持、解码异常等）时回退原图，由上层大小上限兜底。
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= IMAGE_COMPRESS_THRESHOLD) {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file, {
      // 按 EXIF 方向正确绘制（手机竖拍照片）
      imageOrientation: 'from-image',
    } as ImageBitmapOptions);
    const scale = Math.min(
      1,
      IMAGE_COMPRESS_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
    );
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    // 透明 PNG 转 JPEG 会变黑底，先铺白底
    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    if (outType === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outType, IMAGE_COMPRESS_QUALITY)
    );
    // 压缩后没有变小（异常情况）则使用原图
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    const ext = outType === 'image/png' ? 'png' : 'jpg';
    return new File([blob], `${baseName}.${ext}`, { type: outType });
  } catch {
    return file;
  }
}
