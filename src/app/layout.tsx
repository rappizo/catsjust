import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '喵岛 · 猫咪分享社区',
    template: '%s · 喵岛',
  },
  description: '喵岛 —— 只属于猫咪的内容分享社区。晒出你的猫，遇见全世界的猫。',
  keywords: ['猫咪', '猫', '猫咪社区', '猫咪分享', '吸猫', 'Cat'],
  openGraph: {
    title: '喵岛 · 猫咪分享社区',
    description: '只属于猫咪的内容分享社区',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
