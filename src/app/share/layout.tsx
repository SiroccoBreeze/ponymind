/**
 * /share/* 页面布局
 * 根布局 <main> 带有 pt-[72px]（为 Navbar 预留），但分享页隐藏了 Navbar，
 * 所以这里用 -mt-[72px] 把内容拉回顶部。
 */
export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div style={{ marginTop: '-72px' }}>{children}</div>;
}
