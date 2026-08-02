import type { Metadata } from 'next';
import './globals.css';

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
  return (
    <html lang="zh-CN">
      <body className="min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
