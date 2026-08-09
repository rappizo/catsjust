// 为原生工程生成 Android 启动屏图标（splashscreen_logo，透明底荧光绿猫脸）
// 用法：node scripts/generate-native-splash.mjs（在 mobile/ 下运行，复用 sharp）
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// 荧光绿猫脸（viewBox 0 0 1024 1024，对齐 generate-icons.mjs）
const catFaceGreen = `
  <g fill="#2eff8c">
    <path d="M336 480 L356 290 L478 368 Z"/>
    <path d="M688 480 L668 290 L546 368 Z"/>
    <ellipse cx="512" cy="556" rx="232" ry="214"/>
  </g>
  <g fill="#0a0a12">
    <ellipse cx="438" cy="536" rx="28" ry="34"/>
    <ellipse cx="586" cy="536" rx="28" ry="34"/>
    <path d="M495 606 L529 606 L512 644 Z"/>
  </g>
  <g stroke="#0a0a12" stroke-width="11" stroke-linecap="round">
    <line x1="374" y1="576" x2="272" y2="550"/>
    <line x1="374" y1="624" x2="276" y2="640"/>
    <line x1="650" y1="576" x2="752" y2="550"/>
    <line x1="650" y1="624" x2="748" y2="640"/>
  </g>
`;

// Android 12+ 启动图标区域，Expo 默认 imageWidth=100dp，按 density 换算像素
const outRoot = path.resolve('../mobile-native/android/app/src/main/res');
const densityMap = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const base = 100;

for (const [d, mult] of Object.entries(densityMap)) {
  const size = Math.round(base * mult);
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">${catFaceGreen}</svg>`;
  const dir = path.join(outRoot, `drawable-${d}`);
  fs.mkdirSync(dir, { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(path.join(dir, 'splashscreen_logo.png'));
  console.log('generated', `drawable-${d}/splashscreen_logo.png`, `${size}x${size}`);
}
console.log('done ->', outRoot);
