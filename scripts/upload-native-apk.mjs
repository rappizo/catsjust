// 上传原生 App APK 到 Supabase Storage（走 Vercel /apk/ 代理下载）
// 用法：node scripts/upload-native-apk.mjs（根目录）
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?\s*$/);
    if (m) env[m[1]] = m[2];
  });

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('missing env');
  process.exit(1);
}

const APK_PATH = 'mobile-native/android/app/build/outputs/apk/release/app-release.apk';
const STORAGE_PATH = 'apk/catsjust-native-v0.3.0-release.apk';

if (!fs.existsSync(APK_PATH)) {
  console.error('APK not found:', APK_PATH);
  process.exit(1);
}

const sb = createClient(url, key);
const file = fs.readFileSync(APK_PATH);

const { error } = await sb.storage.from('media').upload(STORAGE_PATH, file, {
  contentType: 'application/vnd.android.package-archive',
  upsert: true,
  cacheControl: '3600',
});
if (error) {
  console.error('upload failed:', error.message);
  process.exit(1);
}

const { data } = sb.storage.from('media').getPublicUrl(STORAGE_PATH);
const fileName = STORAGE_PATH.split('/').pop();
console.log('APK public URL:', data.publicUrl);
console.log('Vercel proxy URL: https://www.catsjust.com/apk/' + fileName);
console.log('size MB:', (file.length / 1024 / 1024).toFixed(2));
