/**
 * 测试 deepseek-v4-flash 翻译能力（用于多语言方案评估）
 * 1. 单条翻译（中→英/日/阿）
 * 2. 一次调用批量翻译 11 种语言（JSON 输出）
 * 用法：node scripts/test-deepseek-translate.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const rawLine of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = rawLine.trimEnd().match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const base = process.env.deepseek_V4_base_url;
const key = process.env.deepseek_V4_flash_api_key;
const model = process.env.deepseek_V4_flash_model || 'deepseek-v4-flash';
console.log('BASE:', base, '| MODEL:', model);

const SAMPLE = {
  title: '我家雪球的日常',
  content: '布偶猫的温柔与玻璃心都在这啦～阳光下的小仙女，谁不爱呢？今天带她去公园晒太阳。',
};

async function callChat(messages, maxTokens = 1500) {
  const t0 = Date.now();
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
    signal: AbortSignal.timeout(60000),
  });
  const ms = Date.now() - t0;
  const text = await res.text();
  return { ms, status: res.status, text };
}

// ---- 1. 单条翻译 ----
console.log('\n===== 1. 单条翻译测试 =====');
for (const [lang, name] of [['en', '英语'], ['ja', '日语'], ['ar', '阿拉伯语']]) {
  const r = await callChat([
    { role: 'system', content: `你是专业翻译。把用户内容翻译成${name}，只输出译文。` },
    { role: 'user', content: `标题：${SAMPLE.title}\n正文：${SAMPLE.content}` },
  ]);
  let out = r.text;
  try { out = JSON.parse(r.text)?.choices?.[0]?.message?.content ?? r.text; } catch {}
  console.log(`[${lang}] ${r.status} | ${r.ms}ms`);
  console.log('  ', String(out).slice(0, 180));
}

// ---- 2. 一次调用批量翻译 11 种语言 ----
console.log('\n===== 2. 批量翻译 11 种语言（单次调用） =====');
const LOCALES = [
  ['zh-Hant', '繁体中文'], ['ja', '日语'], ['ko', '韩语'], ['en', '英语'],
  ['de', '德语'], ['fr', '法语'], ['it', '意大利语'], ['es', '西班牙语'],
  ['pt', '葡萄牙语'], ['ar', '阿拉伯语'],
];
const r2 = await callChat([
  {
    role: 'system',
    content: `你是专业翻译。把笔记内容翻译成以下 ${LOCALES.length + 1} 种语言（含简体中文原文）。只输出严格 JSON，格式：
{"zh-Hans":{"title":"...","content":"..."},"ja":{"title":"...","content":"..."},...}`,
  },
  {
    role: 'user',
    content: `标题：${SAMPLE.title}\n正文：${SAMPLE.content}`,
  },
], 4000);
console.log(`HTTP ${r2.status} | ${r2.ms}ms`);
try {
  const choices = JSON.parse(r2.text)?.choices;
  const content = choices?.[0]?.message?.content ?? '';
  console.log('原始输出长度:', content.length);
  // 提取 JSON
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const json = JSON.parse(cleaned);
  const keys = Object.keys(json);
  console.log('返回语言数:', keys.length);
  for (const k of keys) {
    console.log(`  ${k}: ${json[k]?.title} / ${String(json[k]?.content).slice(0, 40)}`);
  }
} catch (e) {
  console.log('JSON 解析失败，原始响应片段:', r2.text.slice(0, 500));
}
