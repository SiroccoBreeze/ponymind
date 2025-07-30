'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // 在管理员页面中不显示导航栏
  if (pathname.startsWith('/admin')) {
    return null;
  }
  
  return <Navbar />;
} 