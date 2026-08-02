/**
 * 只有猫 · apiyi 图片 API 连通性测试
 * 用法：node scripts/test-apiyi.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

for (const rawLine of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = rawLine.trimEnd().match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const base = process.env.APIYI_BASE_URL;
const key = process.env.APIYI_API_KEY;
const model = process.env.AI_IMAGE_MODEL;

console.log('BASE :', base);
console.log('MODEL:', model);
console.log('KEY  :', key ? key.slice(0, 10) + '…' : '(未填)');

const res = await fetch(`${base}/images/generations`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({
    model,
    prompt: 'A cute orange tabby cat sitting on a wooden table, soft warm lighting, photorealistic, 4k',
    n: 1,
    size: '1024x1024',
    response_format: 'b64_json',
  }),
});

const text = await res.text();
console.log('HTTP', res.status);
try {
  const json = JSON.parse(text);
  if (json.data && json.data[0]) {
    const item = json.data[0];
    console.log('字段:', Object.keys(item));
    if (item.b64_json) console.log('b64_json 长度:', item.b64_json.length);
    if (item.url) console.log('url:', item.url.slice(0, 120));
  } else {
    console.log('响应:', JSON.stringify(json).slice(0, 800));
  }
} catch {
  console.log('原始响应:', text.slice(0, 800));
}
