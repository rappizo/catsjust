export const metadata = {
  title: '管理后台',
};

/** 管理后台根布局：登录页与面板共用，具体鉴权在 (panel) 分组内完成 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
