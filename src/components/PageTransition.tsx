'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * 路由切换过渡：路径变化时内容整体淡入上移。
 * 配合移除整页骨架屏（导航期间保持旧页面，数据就绪后一次性切换），
 * 底部 Tab 等页面切换不再闪现空白卡片，过渡更平滑。
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-fade-in-up">
      {children}
    </div>
  );
}
