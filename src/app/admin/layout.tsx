'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SchedulerInitializer from '@/components/SchedulerInitializer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // 检查用户权限
    const checkPermission = async () => {
      try {
        const response = await fetch('/api/admin/dashboard');
        if (response.ok) {
          setIsAuthorized(true);
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('权限检查失败:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [session, status, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在验证权限...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const navItems = [
    { href: '/admin', label: '仪表板', icon: '📊', exact: true },
    { href: '/admin/users', label: '用户管理', icon: '👥' },
    { href: '/admin/posts', label: '内容管理', icon: '📝' },
    { href: '/admin/tags', label: '标签管理', icon: '🏷️' },
    { href: '/admin/settings', label: '系统设置', icon: '⚙️' },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link href="/admin" className="ml-2 lg:ml-0 flex items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">P</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">PonyMind 管理后台</span>
                </div>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-gray-100"
              >
                <span className="hidden sm:inline">返回前台</span>
                <span className="sm:hidden">前台</span>
              </Link>
              <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={session?.user?.image || undefined} alt="用户头像" />
                    <AvatarFallback>{session?.user?.name?.charAt(0).toUpperCase() || 'A'}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                </div>
                <div className="hidden sm:block">
                  <span className="text-sm font-medium text-gray-700">
                    {session?.user?.name}
                  </span>
                  <p className="text-xs text-gray-500">管理员</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* 移动端遮罩 */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 侧边栏 */}
        <nav className={`fixed top-16 left-0 bottom-0 w-64 bg-white shadow-lg border-r border-gray-200 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="h-full overflow-y-auto">
            <div className="p-4">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive(item.href, item.exact)
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                      {isActive(item.href, item.exact) && (
                        <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* 侧边栏底部信息 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-center text-xs text-gray-500">
                <p>PonyMind 管理系统</p>
                <p className="mt-1">v1.0.0</p>
              </div>
            </div>
          </div>
        </nav>

        {/* 主内容区域 */}
        <main className="flex-1 lg:ml-0 min-h-screen">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* 调度器初始化组件 */}
      <SchedulerInitializer />
    </div>
  );
} 