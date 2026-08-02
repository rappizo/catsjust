// 生成 App 图标源图（风格对齐网站左上角 Logo：荧光绿→紫渐变 + 猫脸）
// 用法：node scripts/generate-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const outDir = path.resolve('resources');
fs.mkdirSync(outDir, { recursive: true });

// ---- 猫脸图形（viewBox 0 0 1024 1024） ----
// 深色猫脸轮廓 + 荧光绿眼睛/鼻子
const catFaceDark = `
  <g fill="#04281a">
    <path d="M336 480 L356 290 L478 368 Z"/>
    <path d="M688 480 L668 290 L546 368 Z"/>
    <ellipse cx="512" cy="556" rx="232" ry="214"/>
  </g>
  <g fill="#2eff8c">
    <ellipse cx="438" cy="536" rx="28" ry="34"/>
    <ellipse cx="586" cy="536" rx="28" ry="34"/>
    <path d="M495 606 L529 606 L512 644 Z"/>
  </g>
  <g stroke="#04281a" stroke-width="11" stroke-linecap="round">
    <line x1="374" y1="576" x2="272" y2="550"/>
    <line x1="374" y1="624" x2="276" y2="640"/>
    <line x1="650" y1="576" x2="752" y2="550"/>
    <line x1="650" y1="624" x2="748" y2="640"/>
  </g>
`;

// 荧光绿猫脸（用于深色 adaptive 前景）
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

// 完整图标：绿紫渐变底 + 深色猫脸（对齐网站 Logo）
const iconOnly = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4dff9d"/>
      <stop offset="100%" stop-color="#9a3cf0"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  ${catFaceDark}
</svg>
`;

// adaptive 前景：透明底 + 居中荧光绿猫脸（内容在安全区）
const iconForeground = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(128 128) scale(0.75)">${catFaceGreen}</g>
</svg>
`;

// adaptive 背景：深色（站点卡片色）
const iconBackground = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#14141f"/>
</svg>
`;

// splash：渐变底 + 居中猫脸
const splash = `
<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4dff9d"/>
      <stop offset="100%" stop-color="#9a3cf0"/>
    </linearGradient>
  </defs>
  <rect width="2732" height="2732" fill="url(#sg)"/>
  <g transform="translate(854 854) scale(1)">${catFaceDark}</g>
</svg>
`;

const splashDark = `
<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  <rect width="2732" height="2732" fill="#0a0a12"/>
  <g transform="translate(854 854) scale(1)">${catFaceGreen}</g>
</svg>
`;

async function writePng(name, svg, size) {
  await sharp(Buffer.from(svg), { density: 96 })
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, name));
  console.log('generated', name, `${size}x${size}`);
}

await writePng('icon-only.png', iconOnly, 1024);
await writePng('icon-foreground.png', iconForeground, 1024);
await writePng('icon-background.png', iconBackground, 1024);
await writePng('splash.png', splash, 2732);
await writePng('splash-dark.png', splashDark, 2732);
console.log('done ->', outDir);
