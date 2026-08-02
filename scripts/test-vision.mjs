/**
 * 验证 apiyi gpt-5.5 视觉审核能力
 * 用法：node scripts/test-vision.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const rawLine of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = rawLine.trimEnd().match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

// 取一张已发布笔记的封面图
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data } = await admin.from('notes').select('cover_url').eq('status', 'published').limit(1);
const imageUrl = data?.[0]?.cover_url;
console.log('测试图片:', imageUrl);

const base = process.env.APIYI_BASE_URL;
const model = process.env.AI_VISION_MODEL || 'gpt-5.5';

const res = await fetch(`${base}/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.APIYI_API_KEY}` },
  body: JSON.stringify({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: '请判断这张图片是否包含猫（真猫或画风接近的猫均可）。只需回答是或否。' },
          ...(imageUrl ? [{ type: 'image_url', image_url: { url: imageUrl } }] : []),
        ],
      },
    ],
    max_tokens: 200,
    temperature: 0,
  }),
  signal: AbortSignal.timeout(60000),
});

const text = await res.text();
console.log('HTTP', res.status, '| 模型:', model);
try {
  const json = JSON.parse(text);
  if (json.choices?.[0]?.message?.content) {
    console.log('AI 回答:', json.choices[0].message.content);
  } else {
    console.log('响应:', JSON.stringify(json).slice(0, 600));
  }
} catch {
  console.log('原始响应:', text.slice(0, 600));
}
