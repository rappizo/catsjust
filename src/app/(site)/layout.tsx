import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

/** 前台站点布局：导航 + 内容 + 页脚 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
