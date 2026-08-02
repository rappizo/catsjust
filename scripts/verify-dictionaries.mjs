/**
 * 校验所有语言词典：可导入性 + 与 zh-Hans 的 key 完整性对比
 * 用法：node scripts/verify-dictionaries.mjs
 */
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

const DICTS = {
  'zh-Hant': zhHant,
  ja,
  ko,
  en,
  de,
  fr,
  it,
  es,
  pt,
  ar,
};

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(out, flatten(v, key));
    else out[key] = String(v);
  }
  return out;
}

const src = flatten(zhHans);
const srcKeys = new Set(Object.keys(src));
console.log(`zh-Hans 键数: ${srcKeys.size}`);

for (const [code, dict] of Object.entries(DICTS)) {
  const flat = flatten(dict);
  const keys = Object.keys(flat);
  const missing = [...srcKeys].filter((k) => flat[k] === undefined || flat[k] === '');
  const extra = keys.filter((k) => !srcKeys.has(k));
  // 仍为中文的值（可能未被翻译）
  const chinese = keys.filter((k) => /[一-龥]/.test(flat[k]) && k !== 'hero.eyebrow');
  console.log(
    `${code}: 键数=${keys.length} 缺失=${missing.length}${missing.length ? ' [' + missing.join(', ') + ']' : ''}${extra.length ? ' 多余=' + extra.length : ''}${chinese.length ? ' 含中文值=' + chinese.length : ''}`
  );
}
console.log('\n校验完成。');
