/**
 * 补充翻译：把 zh-Hans 中新增的 key 翻译进已生成的各语言词典（不覆盖已有翻译）
 * 用法：node scripts/supplement-dictionaries.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { zhHans } from '../src/lib/i18n/zh-Hans.ts';
import { zhHant } from '../src/lib/i18n/zh-Hant.ts';
import { ja } from '../src/lib/i18n/ja.ts';
import { ko } from '../src/lib/i18n/ko.ts';
import { en } from '../src/lib/i18n/en.ts';
import { de } from '../src/lib/i18n/de.ts';
import { fr } from '../src/lib/i18n/fr.ts';
import { it } from '../src/lib/i18n/it.ts';
import { es } from '../src/lib/i18n/es.ts';
import { pt } from '../src/lib/i18n/pt.ts';
import { ar } from '../src/lib/i18n/ar.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const rawLine of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = rawLine.trimEnd().match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const base = process.env.deepseek_V4_base_url;
const key = process.env.deepseek_V4_flash_api_key;
const model = process.env.deepseek_V4_flash_model || 'deepseek-v4-flash';

const TARGETS = [
  { code: 'zh-Hant', varName: 'zhHant', dict: zhHant, name: '繁体中文（台灣/香港用語，不要用簡體字）' },
  { code: 'ja', varName: 'ja', dict: ja, name: '日语' },
  { code: 'ko', varName: 'ko', dict: ko, name: '韩语' },
  { code: 'en', varName: 'en', dict: en, name: '英语' },
  { code: 'de', varName: 'de', dict: de, name: '德语' },
  { code: 'fr', varName: 'fr', dict: fr, name: '法语' },
  { code: 'it', varName: 'it', dict: it, name: '意大利语' },
  { code: 'es', varName: 'es', dict: es, name: '西班牙语' },
  { code: 'pt', varName: 'pt', dict: pt, name: '葡萄牙语' },
  { code: 'ar', varName: 'ar', dict: ar, name: '阿拉伯语' },
];

const CHUNK_SIZE = 12;

function extractJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    // 继续
  }
  const start = cleaned.indexOf('{');
  if (start >= 0) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"') inStr = !inStr;
      if (!inStr) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            try { return JSON.parse(cleaned.slice(start, i + 1)); } catch { return null; }
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

async function translateChunk(targetName, chunk) {
  const prompt = `把下面 JSON 对象中的全部 value 翻译成${targetName}。要求：key 完全保持不变；只翻译 value；保留 {max} 占位符；猫咪社区界面文案，自然地道；只输出严格 JSON。
源 JSON：${JSON.stringify(chunk)}`;
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: '你是专业软件本地化翻译，输出严格 JSON。' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 3000,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content ?? '';
      const parsed = extractJson(content);
      if (!parsed) throw new Error('JSON 解析失败');
      return parsed;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  throw lastErr ?? new Error('重试 4 次仍失败');
}

const flatSource = flatten(zhHans);

// 可选：node scripts/supplement-dictionaries.mjs es pt 只处理指定语言
const args = process.argv.slice(2);
const targets = args.length ? TARGETS.filter((t) => args.includes(t.code)) : TARGETS;

// 中日韩语言天然含汉字，不做"仍为中文"检查（韩文不含中文，需检查）
const CJK_LANGS = new Set(['zh-Hant', 'ja']);

for (const t of targets) {
  const flatTarget = flatten(t.dict);
  const missing = Object.keys(flatSource).filter(
    (k) => flatTarget[k] === undefined || flatTarget[k] === ''
  );
  // 非中日韩语言中，值仍含汉字的视为未翻译（原批次兜底）
  const chinese = CJK_LANGS.has(t.code)
    ? []
    : Object.keys(flatTarget).filter((k) => /[一-龥]/.test(flatTarget[k]));
  const targets = [...new Set([...missing, ...chinese])];
  if (!targets.length) {
    console.log(`✅ ${t.code} 无缺失 key`);
    continue;
  }
  console.log(`${t.code} 待翻译 ${targets.length} 个 key（缺失 ${missing.length} + 中文值 ${chinese.length}）`);
  const merged = { ...flatTarget };
  let failed = 0;
  for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
    const chunkKeys = targets.slice(i, i + CHUNK_SIZE);
    const chunk = Object.fromEntries(chunkKeys.map((k) => [k, flatSource[k]]));
    try {
      const result = await translateChunk(t.name, chunk);
      for (const k of chunkKeys) {
        merged[k] = result[k] && String(result[k]).trim() ? String(result[k]) : flatSource[k];
      }
      console.log(`  ${t.code} 补充批次 ${i / CHUNK_SIZE + 1}/${Math.ceil(targets.length / CHUNK_SIZE)} 完成`);
    } catch {
      for (const k of chunkKeys) merged[k] = flatSource[k];
      failed++;
      console.log(`  ${t.code} 补充批次 ${i / CHUNK_SIZE + 1} 失败（原文兜底）`);
    }
  }
  const data = unflatten(merged);
  const outFile = join(root, 'src', 'lib', 'i18n', `${t.code}.ts`);
  const lines = [
    `/**\n * ${t.name}（由 deepseek-v4-flash 从简体中文自动生成）\n */`,
    `export const ${t.varName} = ${JSON.stringify(data, null, 2)};`,
    '',
  ];
  writeFileSync(outFile, lines.join('\n'), 'utf8');
  console.log(`✅ ${t.code} 已写入（${failed} 批兜底）`);
}
console.log('\n完成。');
