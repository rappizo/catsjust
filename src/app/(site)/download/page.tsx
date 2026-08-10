import type { Metadata } from 'next';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Check, Download, Smartphone, ShieldAlert } from 'lucide-react';

/** 当前分发版本（原生 App，独立于套壳 APP_VERSION） */
const NATIVE_APP_VERSION = '1.1.1';

export const metadata: Metadata = {
  title: '下载 App · 只有猫',
  description: '下载「只有猫」安卓 App，随时随地云吸猫。',
};

/** 下载页固定域名（生产域名） */
const SITE_URL = 'https://www.catsjust.com';
const DOWNLOAD_URL = `${SITE_URL}/download`;
const APK_URL = process.env.NEXT_PUBLIC_APK_URL || '';
/** 备用下载线路：Supabase 存储直链（CDN 线路异常时可切换） */
const APK_FALLBACK_URL = process.env.NEXT_PUBLIC_APK_URL_FALLBACK || '';

const STEPS = [
  { title: '点击下载 APK', desc: '点上方「下载安卓版」按钮，获取安装包（约 35 MB）' },
  { title: '允许安装未知来源', desc: '安卓系统会提示「禁止安装未知应用」，点击「设置」→ 允许来自此来源的安装' },
  { title: '安装并打开', desc: '安装完成后打开「只有猫」，登录账号即可开始云吸猫' },
];

const FAQS = [
  { q: '为什么需要允许未知来源？', a: '「只有猫」未上架应用商店，属于独立分发，安卓系统会默认拦截非商店应用，需手动放行。安装包由官方发布，可放心安装。' },
  { q: 'App 与网站内容同步吗？', a: '完全同步。App 为原生开发，与网站共享同一云端，登录同一账号后，作品、消息、推荐全部实时一致。' },
  { q: '有 iOS 版吗？', a: 'iOS 版正在准备中，暂可通过浏览器访问 www.catsjust.com 获得同等体验。' },
];

export default async function DownloadPage() {
  // 生成指向下载页的二维码（扫码 → 打开下载页 → 下载）
  const qrDataUrl = await QRCode.toDataURL(DOWNLOAD_URL, {
    margin: 1,
    width: 240,
    errorCorrectionLevel: 'M',
    color: { dark: '#0a0a12', light: '#ffffff' },
  });

  const apkAvailable = APK_URL.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* 头部 */}
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-accent-500 text-[#04281a] shadow-lg shadow-neon-green">
          <Smartphone className="h-10 w-10" />
        </span>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">只有猫 · Android 版</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-400">
          在手机上体验完整的「只有猫」：瀑布流推荐、私信、猫咪广场……与网站数据实时同步。
        </p>
      </div>

      {/* 下载卡片 */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {/* 下载按钮区 */}
        <div className="flex flex-col items-center justify-center rounded-3xl border border-stone-200/60 bg-white p-6 text-center shadow-card">
          <div className="mb-4 flex items-center gap-2 text-sm text-stone-400">
            <Smartphone className="h-4 w-4" />
            最新版 · v{NATIVE_APP_VERSION}
            <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-medium text-brand-600">
              正式版
            </span>
          </div>
          {apkAvailable ? (
            <>
              <a
                href={APK_URL}
                download
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 py-3.5 text-sm font-bold text-[#04281a] shadow-lg shadow-neon-green transition hover:brightness-110"
              >
                <Download className="h-5 w-5" />
                下载安卓版（APK）
              </a>
              {APK_FALLBACK_URL && (
                <a
                  href={APK_FALLBACK_URL}
                  className="mt-3 text-xs text-stone-400 underline-offset-2 transition hover:text-brand-500 hover:underline"
                >
                  下载慢？试试备用线路
                </a>
              )}
            </>
          ) : (
            <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-300 py-3.5 text-sm text-stone-400">
              <span>安卓版即将上线，敬请期待</span>
              <span className="text-xs">上线后可扫码或点击按钮下载</span>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-stone-400">
            <span className="flex items-center gap-1"><Check className="h-3 w-3 text-brand-500" /> 需要 Android 7.0+</span>
            <span className="flex items-center gap-1"><Check className="h-3 w-3 text-brand-500" /> 免费 · 无广告</span>
            <span className="flex items-center gap-1"><Check className="h-3 w-3 text-brand-500" /> 与网站数据同步</span>
          </div>
        </div>

        {/* 二维码区 */}
        <div className="flex flex-col items-center justify-center rounded-3xl border border-stone-200/60 bg-white p-6 text-center shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="扫码下载只有猫"
            className="h-48 w-48 rounded-2xl border border-stone-200"
            width={240}
            height={240}
          />
          <p className="mt-3 text-sm font-medium text-stone-600">手机扫码下载</p>
          <p className="mt-1 text-xs text-stone-400">打开安卓手机相机 / 浏览器扫码，即可进入下载页</p>
        </div>
      </div>

      {/* 安装步骤 */}
      <section className="mt-8 rounded-3xl border border-stone-200/60 bg-white p-6 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
          <Smartphone className="h-5 w-5 text-brand-500" />
          安装步骤
        </h2>
        <ol className="space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-600">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-stone-700">{s.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-stone-400">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 常见问题 */}
      <section className="mt-6 rounded-3xl border border-stone-200/60 bg-white p-6 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          常见问题
        </h2>
        <div className="space-y-4">
          {FAQS.map((f) => (
            <div key={f.q}>
              <p className="text-sm font-semibold text-stone-700">{f.q}</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-400">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 回到网站 */}
      <p className="mt-8 text-center text-sm text-stone-400">
        也可以直接使用网页版：
        <Link href="/" className="font-medium text-brand-500 hover:text-brand-600">
          www.catsjust.com
        </Link>
      </p>
    </div>
  );
}
