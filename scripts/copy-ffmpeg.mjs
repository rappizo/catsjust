// 将 @ffmpeg/core（esm 单线程构建）的运行时文件复制到 public/ffmpeg，供客户端按需加载
// 注意：必须用 esm 版（有 export default），因为 @ffmpeg/ffmpeg 的 worker 是 module 类型
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'esm');
const dest = path.join(__dirname, '..', 'public', 'ffmpeg');

fs.mkdirSync(dest, { recursive: true });
for (const f of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  const from = path.join(src, f);
  if (!fs.existsSync(from)) {
    console.warn('skip missing', from);
    continue;
  }
  fs.copyFileSync(from, path.join(dest, f));
}
console.log('ffmpeg core copied ->', dest);
