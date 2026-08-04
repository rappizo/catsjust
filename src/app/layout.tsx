import type { Metadata, Viewport } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';
import { DEFAULT_LOCALE, getLocaleRtl, type LocaleCode } from '@/lib/i18n/config';

export const metadata: Metadata = {
  title: {
    default: '只有猫 · Just Cats Here',
    template: '%s · 只有猫',
  },
  description: '只有猫（CATSJUST）—— 只属于猫咪的内容分享社区。晒出你的猫，遇见全世界的猫。',
  keywords: ['猫咪', '猫', 'Just Cats Here', '猫咪分享', '吸猫', 'CATSJUST'],
  openGraph: {
    title: '只有猫 · Just Cats Here',
    description: '只属于猫咪的内容分享社区',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '只有猫',
  },
};

/** 移动端适配：内容保持在系统栏安全区之内（不延伸进状态栏） */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a12',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 多语言暂未开放：系统固定为简体中文。待整体完善后，再恢复从 cookie 读取用户语言偏好。
  const locale: LocaleCode = DEFAULT_LOCALE;
  const dir = getLocaleRtl(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen font-sans antialiased">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
