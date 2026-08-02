/**
 * 用 deepseek-v4-flash 从简体中文词典生成 10 种语言词典
 * 分块翻译（每批约 25 键）避免输出截断，带重试
 * 用法：node scripts/generate-dictionaries.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { zhHans } from '../src/lib/i18n/zh-Hans.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const rawLine of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = rawLine.trimEnd().match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const base = process.env.deepseek_V4_base_url;
const key = process.env.deepseek_V4_flash_api_key;
const model = process.env.deepseek_V4_flash_model || 'deepseek-v4-flash';

const TARGETS = [
  { code: 'zh-Hant', varName: 'zhHant', name: '繁体中文（台灣/香港用語，不要用簡體字）' },
  { code: 'ja', varName: 'ja', name: '日语' },
  { code: 'ko', varName: 'ko', name: '韩语' },
  { code: 'en', varName: 'en', name: '英语' },
  { code: 'de', varName: 'de', name: '德语' },
  { code: 'fr', varName: 'fr', name: '法语' },
  { code: 'it', varName: 'it', name: '意大利语' },
  { code: 'es', varName: 'es', name: '西班牙语' },
  { code: 'pt', varName: 'pt', name: '葡萄牙语' },
  { code: 'ar', varName: 'ar', name: '阿拉伯语' },
];

const CHUNK_SIZE = 12;

/** 容错 JSON 提取：直接解析失败则尝试抓取第一个完整的 {...} */
function extractJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    // 继续尝试
  }
  const start = cleaned.indexOf('{');
  if (start >= 0) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === '\\' && inStr) {
        esc = true;
        continue;
      }
      if (ch === '"') inStr = !inStr;
      if (!inStr) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            try {
              return JSON.parse(cleaned.slice(start, i + 1));
            } catch {
              return null;
            }
          }
        }
      }
    }
  }
  return null;
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(out, flatten(v, key));
    else out[key] = String(v);
  }
  return out;
}

function unflatten(flat) {
  const out = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] || {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return out;
}

async function callChat(messages, maxTokens) {
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.2 }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? '';
  const parsed = extractJson(content);
  if (!parsed) throw new Error('JSON 解析失败');
  return parsed;
}

async function translateChunk(targetName, chunk) {
  const prompt = `把下面 JSON 对象中的全部 value 翻译成${targetName}。要求：key 完全保持不变；只翻译 value；保留 {max} 占位符；猫咪社区界面文案，自然地道；只输出严格 JSON。
源 JSON：${JSON.stringify(chunk)}`;
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await callChat(
        [
          { role: 'system', content: '你是专业软件本地化翻译，输出严格 JSON。' },
          { role: 'user', content: prompt },
        ],
        3000
      );
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  throw lastErr ?? new Error('重试 4 次仍失败');
}

async function translateOne(target) {
  const flat = flatten(zhHans);
  const keys = Object.keys(flat);
  const merged = {};

  for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
    const chunkKeys = keys.slice(i, i + CHUNK_SIZE);
    const chunk = Object.fromEntries(chunkKeys.map((k) => [k, flat[k]]));
    try {
      const result = await translateChunk(target.name, chunk);
      for (const k of chunkKeys) {
        merged[k] = result[k] && String(result[k]).trim() ? String(result[k]) : flat[k];
      }
      console.log(`  ${target.code} 批次 ${i / CHUNK_SIZE + 1}/${Math.ceil(keys.length / CHUNK_SIZE)} 完成`);
    } catch {
      // 该批失败：用源语言兜底，保证词典完整
      for (const k of chunkKeys) merged[k] = flat[k];
      console.log(`  ${target.code} 批次 ${i / CHUNK_SIZE + 1} 失败（用原文兜底）`);
    }
  }

  return unflatten(merged);
}

const flatSource = flatten(zhHans);
const allKeys = Object.keys(flatSource);

// 可选：node scripts/generate-dictionaries.mjs pt ar 只生成指定语言
const args = process.argv.slice(2);
const targetList = args.length ? TARGETS.filter((t) => args.includes(t.code)) : TARGETS;

console.log(`源词典键数: ${allKeys.length}，分块 ${Math.ceil(allKeys.length / CHUNK_SIZE)} 批`);

for (const t of targetList) {
  const outFile = join(root, 'src', 'lib', 'i18n', `${t.code}.ts`);
  if (existsSync(outFile)) {
    console.log(`⏭️ ${t.code} 已存在，跳过`);
    continue;
  }
  try {
    const data = await translateOne(t);
    const lines = [
      `/**\n * ${t.name}（由 deepseek-v4-flash 从简体中文自动生成）\n */`,
      `export const ${t.varName} = ${JSON.stringify(data, null, 2)};`,
      '',
    ];
    writeFileSync(outFile, lines.join('\n'), 'utf8');
    console.log(`✅ ${t.code}（${t.name}）已生成`);
  } catch (e) {
    console.error(`❌ ${t.code} 失败: ${e.message}`);
  }
}
console.log('\n完成。');
