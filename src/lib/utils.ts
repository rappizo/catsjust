/** 合并 class 名称 */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

/** 数字格式化：1000 -> 1.2k, 10000 -> 1.5w */
export function formatCount(n: number): string {
  if (n >= 100000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** 相对时间：刚刚 / n 分钟前 / n 小时前 / n 天前 / 日期 */
export function timeAgo(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} 天前`;
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** 完整日期 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** 性别文案 */
export function genderLabel(gender: string): string {
  if (gender === 'male') return '公猫';
  if (gender === 'female') return '母猫';
  return '未知';
}

/** 笔记状态文案 */
export function noteStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return '待审核';
    case 'published':
      return '已发布';
    case 'rejected':
      return '未通过';
    case 'removed':
      return '已下架';
    default:
      return status;
  }
}

/** 校验文件是否为图片 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/** 校验文件是否为视频 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/** 获取文件扩展名 */
export function fileExtension(file: File): string {
  const name = file.name.split('.').pop();
  return name && name.length <= 6 ? name.toLowerCase() : 'bin';
}

/** 读取视频时长（秒），用于上传校验 */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => {
      resolve(video.duration || 0);
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      reject(new Error('无法读取视频信息'));
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

/** 从视频提取第一帧作为封面（Blob） */
export function captureVideoFrame(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = url;

    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) * 0.1);
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('无法生成封面'));
        },
        'image/jpeg',
        0.85
      );
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('视频加载失败'));
    };
  });
}
