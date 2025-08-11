'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import UserAvatar from '@/components/UserAvatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { 
  Home, 
  HelpCircle, 
  Settings, 
  Bell, 
  User, 
  LogOut, 
  Shield, 
  Menu, 
  MessageSquare,
  FileText
} from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<{
    _id: string;
    title: string;
    content: string;
    isRead: boolean;
    createdAt: string;
  }[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
    location?: string;
    website?: string;
    createdAt: string;
  } | null>(null);

  const adminCheckCacheRef = useRef<{ [key: string]: boolean }>({});
  const adminCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 获取用户资料
  const fetchUserProfile = async () => {
    if (!session?.user?.email) return;
    
    try {
      const response = await fetch('/api/users/profile');
      if (response.ok) {
        const profileData = await response.json();
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error('获取用户资料失败:', error);
    }
  };

  // 获取未读消息数量
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!session?.user?.email) {
        setUnreadCount(0);
        return;
      }

      try {
        const response = await fetch('/api/users/messages?page=1&limit=1');
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('获取未读消息数失败:', error);
      }
    };

    fetchUnreadCount();
    
    // 每30秒检查一次未读消息
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [session?.user?.email]);

  // 获取用户资料
  useEffect(() => {
    fetchUserProfile();
  }, [session?.user?.email]);

  // 监听头像变化事件
  useEffect(() => {
    const handleAvatarChange = () => {
      fetchUserProfile();
    };

    // 监听自定义事件
    window.addEventListener('avatar-changed', handleAvatarChange);
    
    return () => {
      window.removeEventListener('avatar-changed', handleAvatarChange);
    };
  }, []);

  // 优化admin权限检查，添加缓存和防抖
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!session?.user?.email) {
        setIsAdmin(false);
        return;
      }

      const cacheKey = session.user.email;
      
      // 检查缓存
      if (adminCheckCacheRef.current[cacheKey] !== undefined) {
        setIsAdmin(adminCheckCacheRef.current[cacheKey]);
        return;
      }

      // 清除之前的定时器
      if (adminCheckTimeoutRef.current) {
        clearTimeout(adminCheckTimeoutRef.current);
      }

      // 防抖：200ms后执行检查
      adminCheckTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch('/api/admin/dashboard');
          const result = response.ok;
          
          // 缓存结果（5分钟有效期）
          adminCheckCacheRef.current[cacheKey] = result;
          setTimeout(() => {
            delete adminCheckCacheRef.current[cacheKey];
          }, 5 * 60 * 1000);
          
          setIsAdmin(result);
        } catch {
          adminCheckCacheRef.current[cacheKey] = false;
          setIsAdmin(false);
        }
      }, 200);
    };

    checkAdminStatus();

    // 清理函数
    return () => {
      if (adminCheckTimeoutRef.current) {
        clearTimeout(adminCheckTimeoutRef.current);
      }
    };
  }, [session?.user?.email]); // 只依赖email变化

  // 获取消息通知列表
  const fetchNotifications = async () => {
    if (!session?.user?.email || loadingNotifications) return;

    setLoadingNotifications(true);
    try {
      const response = await fetch('/api/users/messages?page=1&limit=5');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.messages || []);
      }
    } catch (error) {
      console.error('获取消息通知失败:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // 如果是认证页面或管理页面，不显示导航栏
  if (pathname?.startsWith('/auth/') || pathname?.startsWith('/admin/')) {
    return null;
  }

  const navLinks = [
    { href: '/', label: '首页', icon: Home },
    { href: '/faq', label: 'FAQ', icon: HelpCircle },
    { href: '/services', label: '服务', icon: Settings },
    { href: '/events', label: '事件', icon: FileText },
  ];

  const isActiveLink = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* 固定导航栏 */}
      <nav className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-md border-b z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* 左侧 Logo 和导航链接 */}
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0">
                <Link href="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-sm">
                    <FileText className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    PonyMind
                  </span>
                </Link>
              </div>

              {/* 桌面端导航链接 */}
              <div className="hidden md:flex items-center space-x-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActiveLink(link.href)
                          ? 'bg-accent text-accent-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 右侧用户菜单 */}
            <div className="flex items-center space-x-4">
              {/* 主题切换 */}
              <ThemeToggle />

              {/* 移动端菜单按钮 */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center space-x-2 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <span className="text-xl font-bold">PonyMind</span>
                    </div>
                    
                    <div className="space-y-2">
                      {navLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                              isActiveLink(link.href)
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{link.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                    
                    <Separator className="my-4" />
                    
                    {/* 移动端登录注册按钮 */}
                    {!session?.user && (
                      <div className="space-y-2">
                        <Link href="/auth/signin" className="w-full">
                          <Button variant="outline" className="w-full">
                            登录
                          </Button>
                        </Link>
                        <Link href="/auth/register" className="w-full">
                          <Button className="w-full">
                            注册
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              {session?.user ? (
                <div className="flex items-center space-x-3">
                  {/* 消息通知按钮 */}
                  <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="relative"
                        onClick={() => {
                          if (!showNotifications) {
                            fetchNotifications();
                          }
                        }}
                      >
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <div className="flex items-center justify-between p-4 border-b">
                        <h3 className="text-lg font-semibold">消息通知</h3>
                        <Link
                          href="/user-center?section=messages"
                          onClick={() => setShowNotifications(false)}
                          className="text-sm text-primary hover:text-primary/80"
                        >
                          查看全部
                        </Link>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {loadingNotifications ? (
                          <div className="p-4 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                            <p className="text-sm text-muted-foreground mt-2">加载中...</p>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-4 text-center">
                            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">暂无新消息</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div 
                              key={notification._id} 
                              className={`p-4 border-b hover:bg-accent cursor-pointer ${!notification.isRead ? 'bg-accent/50' : ''}`}
                              onClick={async () => {
                                // 如果消息未读，标记为已读
                                if (!notification.isRead) {
                                  try {
                                    const response = await fetch('/api/users/messages', {
                                      method: 'PATCH',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({ 
                                        messageIds: [notification._id] 
                                      }),
                                    });
                                    
                                    if (response.ok) {
                                      // 更新本地状态
                                      setNotifications(prev => prev.map(msg => 
                                        msg._id === notification._id 
                                          ? { ...msg, isRead: true }
                                          : msg
                                      ));
                                      setUnreadCount(prev => Math.max(0, prev - 1));
                                    }
                                  } catch (error) {
                                    console.error('标记消息已读失败:', error);
                                  }
                                }
                              }}
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`w-2 h-2 rounded-full mt-2 ${!notification.isRead ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {notification.content}
                                  </p>
                                  <p className="text-xs text-muted-foreground/70 mt-1">
                                    {new Date(notification.createdAt).toLocaleDateString('zh-CN')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* 用户菜单 */}
                  <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-3 p-2">
                        <UserAvatar 
                          avatar={userProfile?.avatar}
                          userName={userProfile?.name || session.user.name || session.user.email || '用户'}
                          size="sm"
                        />
                        <span className="hidden sm:block font-medium text-sm">
                          {userProfile?.name || session.user.name || session.user.email?.split('@')[0]}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-4 py-3 border-b">
                        <p className="text-sm font-medium">{userProfile?.name || session.user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{userProfile?.email || session.user.email}</p>
                      </div>
                      
                      <DropdownMenuItem asChild>
                        <Link href="/user-center" onClick={() => setIsMenuOpen(false)}>
                          <User className="mr-2 h-4 w-4" />
                          用户中心
                        </Link>
                      </DropdownMenuItem>
                      
                      {/* 管理员入口 */}
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" onClick={() => setIsMenuOpen(false)}>
                            <Shield className="mr-2 h-4 w-4" />
                            管理后台
                          </Link>
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => {
                          setIsMenuOpen(false);
                          signOut({ callbackUrl: '/auth/signin' });
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        退出登录
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-3">
                  <Link href="/auth/signin">
                    <Button variant="ghost">
                      登录
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button>
                      注册
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 顶部占位空间 */}
      <div className="h-16"></div>
    </>
  );
} 