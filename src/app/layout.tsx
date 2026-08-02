import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';
import { LOCALE_COOKIE, DEFAULT_LOCALE, isLocale, getLocaleRtl, type LocaleCode } from '@/lib/i18n/config';

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookie = cookies().get(LOCALE_COOKIE)?.value;
  const locale: LocaleCode = isLocale(cookie) ? cookie : DEFAULT_LOCALE;
  const dir = getLocaleRtl(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen font-sans antialiased">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
