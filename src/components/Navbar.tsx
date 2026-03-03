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
  Settings, 
  Bell, 
  User, 
  LogOut, 
  Shield, 
  Menu, 
  MessageSquare,
  FileText,
  Database,
  BarChart3,
  ChevronDown,
  BookOpen
} from 'lucide-react';
import { displayLocalTime } from '@/lib/frontend-time-utils';

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
    relatedId?: string; // 关联的帖子ID
    relatedType?: 'post'; // 关联的类型
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
  const [registrationEnabled, setRegistrationEnabled] = useState(true);

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

  // 检查用户注册功能是否启用
  const checkRegistrationStatus = async () => {
    try {
      const response = await fetch('/api/system-parameters');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRegistrationEnabled(data.parameters.allowRegistration !== false);
        }
      }
    } catch (error) {
      console.error('检查注册状态失败:', error);
      // 如果检查失败，默认允许注册
      setRegistrationEnabled(true);
    }
  };

  // 检查注册功能状态
  useEffect(() => {
    checkRegistrationStatus();
  }, []);

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

  // 当用户登录后，立即获取消息通知
  useEffect(() => {
    if (session?.user?.email) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [session?.user?.email]);

  // 监听页面可见性变化，当用户返回页面时刷新消息状态
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && session?.user?.email) {
        // 用户返回页面时，刷新消息状态
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user?.email]);

  // 监听全局消息状态变化事件
  useEffect(() => {
    const handleMessageUpdate = () => {
      if (session?.user?.email) {
        // 当收到消息更新事件时，刷新消息状态
        fetchNotifications();
        // 同时刷新未读消息数量
        const fetchUnreadCount = async () => {
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
      }
    };

    // 监听自定义事件
    window.addEventListener('message-updated', handleMessageUpdate);
    
    return () => {
      window.removeEventListener('message-updated', handleMessageUpdate);
    };
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
      const response = await fetch('/api/users/messages?page=1&limit=10');
      if (response.ok) {
        const data = await response.json();
        console.log('获取到的消息数据:', data);
        console.log('消息数量:', data.messages?.length || 0);
        console.log('未读消息数:', data.unreadCount || 0);
        setNotifications(data.messages || []);
        // 同步未读消息数量
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('获取消息通知失败:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // 标记消息为已读
  const markMessageAsRead = async (messageId: string) => {
    try {
      const response = await fetch('/api/users/messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messageIds: [messageId] 
        }),
      });
      
      if (response.ok) {
        // 更新本地状态
        setNotifications(prev => prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, isRead: true }
            : msg
        ));
        // 更新未读消息数量
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // 触发全局消息更新事件，通知其他组件
        window.dispatchEvent(new CustomEvent('message-updated'));
        
        // 延迟关闭下拉菜单，给用户更好的反馈
        setTimeout(() => {
          setShowNotifications(false);
        }, 500);
      }
    } catch (error) {
      console.error('标记消息已读失败:', error);
    }
  };

  // 标记所有消息为已读
  const markAllMessagesAsRead = async () => {
    try {
      const response = await fetch('/api/users/messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          markAllAsRead: true 
        }),
      });
      
      if (response.ok) {
        // 更新本地状态
        setNotifications(prev => prev.map(msg => ({ ...msg, isRead: true })));
        setUnreadCount(0);
        
        // 触发全局消息更新事件，通知其他组件
        window.dispatchEvent(new CustomEvent('message-updated'));
      }
    } catch (error) {
      console.error('标记所有消息已读失败:', error);
    }
  };

  // 同步未读消息数量
  const syncUnreadCount = () => {
    const unreadMessages = notifications.filter(msg => !msg.isRead);
    setUnreadCount(unreadMessages.length);
  };

  // 当消息列表变化时，同步未读消息数量
  useEffect(() => {
    syncUnreadCount();
  }, [notifications]);

  // 如果是认证页面或管理页面，不显示导航栏
  if (pathname?.startsWith('/auth/') || pathname?.startsWith('/admin/')) {
    return null;
  }

  const navLinks = [
    { href: '/', label: '首页', icon: Home },
    { href: '/knowledge', label: '知识库', icon: BookOpen },
    { href: '/events', label: '事件', icon: FileText },
  ];

  const serviceLinks = [
    { href: '/resources', label: '资源', icon: Database },
    { href: '/reports', label: '报表', icon: BarChart3 },
  ];

  const isActiveLink = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  // ── MASTER §8.5 nav link 樣式 helper ──────────────────────────────────────
  // active:   bg-primary/5 text-primary font-semibold
  // inactive: text-muted-foreground hover:text-foreground hover:bg-accent
  const navLinkCls = (href: string) =>
    [
      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium",
      "transition-colors duration-150 cursor-pointer",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      isActiveLink(href)
        ? "bg-primary/5 text-primary font-semibold"
        : "text-muted-foreground hover:text-foreground hover:bg-accent",
    ].join(" ");

  // ── Mobile Sheet link 樣式 (padding 更大) ──────────────────────────────────
  const mobileLinkCls = (href: string) =>
    [
      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium",
      "transition-colors duration-150 cursor-pointer",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      isActiveLink(href)
        ? "bg-primary/5 text-primary font-semibold"
        : "text-muted-foreground hover:text-foreground hover:bg-accent",
    ].join(" ");

  return (
    <>
      {/*
        ── Navbar ────────────────────────────────────────────────────────────
        glass-navbar  → MASTER §8.5 + globals.css .glass-navbar
        fixed top-0   → 固定頂部
        z-50          → 高於所有內容
        h-16          → 64px 固定高度 (MASTER §8.5)
        無佔位 div    → layout.tsx 的 <main pt-16> 負責偏移
      */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 glass-navbar h-16"
        role="navigation"
        aria-label="主导航"
      >
        {/* MASTER §4: max-w-7xl 居中，h-full 撐滿 64px */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">

          {/* ── 左側：Logo + 桌面導航 ─────────────────────────────────── */}
          <div className="flex items-center gap-8">

            {/* Logo — MASTER §8.5: font-heading font-bold text-xl text-primary */}
            <Link
              href="/"
              className="flex items-center gap-2 cursor-pointer flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
            >
              {/* 品牌圖示 — bg-primary 實色方塊，非漸變（MASTER §1：禁止 AI purple 漸變） */}
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <MessageSquare className="w-5 h-5 text-primary-foreground" strokeWidth={1.5} />
              </div>
              {/* MASTER §8.5 Logo: font-heading */}
              <span className="font-heading font-bold text-xl text-primary">
                PonyMind
              </span>
            </Link>

            {/* 桌面導航連結 — MASTER §8.5 */}
            <nav className="hidden md:flex items-center gap-1" aria-label="主菜单">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={navLinkCls(href)}>
                  {/* MASTER §13: strokeWidth={1.5} */}
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  <span>{label}</span>
                </Link>
              ))}

              {/* 服務下拉 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={[
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium h-auto",
                      "transition-colors duration-150 cursor-pointer",
                      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      isActiveLink('/resources') || isActiveLink('/reports')
                        ? "bg-primary/5 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    ].join(" ")}
                  >
                    <Settings className="w-4 h-4" strokeWidth={1.5} />
                    <span>服务</span>
                    <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {serviceLinks.map(({ href, label, icon: Icon }) => (
                    <DropdownMenuItem key={href} asChild>
                      <Link href={href} className="flex items-center gap-2 w-full cursor-pointer">
                        <Icon className="w-4 h-4" strokeWidth={1.5} />
                        <span>{label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          {/* ── 右側：主題切換 + 移動選單 + 用戶區 ──────────────────── */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* 移動端 Hamburger + Sheet — MASTER §8.5 */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="打开移动菜单"
                >
                  <Menu className="h-5 w-5" strokeWidth={1.5} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[360px]">
                <div className="flex flex-col h-full">
                  {/* Sheet Logo */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-primary-foreground" strokeWidth={1.5} />
                    </div>
                    <span className="font-heading font-bold text-xl text-primary">PonyMind</span>
                  </div>

                  <nav className="space-y-1" aria-label="移动端菜单">
                    {navLinks.map(({ href, label, icon: Icon }) => (
                      <Link key={href} href={href} className={mobileLinkCls(href)}>
                        <Icon className="w-4 h-4" strokeWidth={1.5} />
                        <span>{label}</span>
                      </Link>
                    ))}

                    <div className="pt-2">
                      <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        服务
                      </p>
                      {serviceLinks.map(({ href, label, icon: Icon }) => (
                        <Link key={href} href={href} className={mobileLinkCls(href)}>
                          <Icon className="w-4 h-4" strokeWidth={1.5} />
                          <span>{label}</span>
                        </Link>
                      ))}
                    </div>
                  </nav>

                  <Separator className="my-4" />

                  {!session?.user && (
                    <div className="space-y-2">
                      <Link href="/auth/signin" className="w-full">
                        <Button
                          variant="outline"
                          className="w-full cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          登录
                        </Button>
                      </Link>
                      {registrationEnabled && (
                        <Link href="/auth/register" className="w-full">
                          <Button className="w-full cursor-pointer focus-visible:ring-2 focus-visible:ring-primary">
                            注册
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* ── 已登入：通知 + 用戶選單 ─────────────────────────── */}
            {session?.user ? (
              <div className="flex items-center gap-2">

                {/* 通知鈴 */}
                <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label={`通知${unreadCount > 0 ? `，${unreadCount} 条未读` : ''}`}
                      onClick={fetchNotifications}
                    >
                      <Bell className="h-5 w-5" strokeWidth={1.5} />
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
                    {/* 通知頭部 */}
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <h3 className="text-base font-semibold">消息通知</h3>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllMessagesAsRead}
                            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer h-7 px-2"
                          >
                            全部已读
                          </Button>
                        )}
                        <Link
                          href="/user-center?section=messages"
                          onClick={() => setShowNotifications(false)}
                          className="text-sm text-primary hover:text-primary/80 transition-colors duration-150 cursor-pointer"
                        >
                          查看全部
                        </Link>
                      </div>
                    </div>

                    {/* 通知列表 */}
                    <div className="max-h-72 overflow-y-auto">
                      {loadingNotifications ? (
                        <div className="p-6 text-center">
                          {/* MASTER §7.4: 只在 loading 用 animate-spin */}
                          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
                          <p className="text-sm text-muted-foreground mt-2">加载中...</p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <MessageSquare
                            className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2"
                            strokeWidth={1.5}
                          />
                          <p className="text-sm text-muted-foreground">暂无新消息</p>
                        </div>
                      ) : (
                        <>
                          {notifications.filter((m) => !m.isRead).length === 0 && (
                            <div className="px-4 py-2 text-center border-b">
                              <p className="text-xs text-muted-foreground">所有消息已读</p>
                            </div>
                          )}
                          {notifications.map((notification) => (
                            <div
                              key={notification._id}
                              role="button"
                              tabIndex={0}
                              className={[
                                "px-4 py-3 border-b last:border-0 cursor-pointer",
                                "transition-colors duration-150",
                                "focus-visible:outline-none focus-visible:bg-accent",
                                !notification.isRead
                                  ? "bg-primary/5 hover:bg-primary/10"
                                  : "hover:bg-accent",
                              ].join(" ")}
                              onClick={async () => {
                                if (!notification.isRead) {
                                  await markMessageAsRead(notification._id);
                                }
                                if (notification.relatedId && notification.relatedType === 'post') {
                                  setShowNotifications(false);
                                  window.open(`/posts/${notification.relatedId}`, '_blank');
                                } else {
                                  setShowNotifications(false);
                                  window.location.href = '/user-center?section=messages';
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click();
                              }}
                            >
                              <div className="flex items-start gap-3">
                                {/* 已讀/未讀指示點 */}
                                <div
                                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                    !notification.isRead ? 'bg-primary' : 'bg-muted-foreground/30'
                                  }`}
                                  aria-hidden="true"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{notification.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {notification.content}
                                  </p>
                                  <p className="text-xs text-muted-foreground/60 mt-1">
                                    {displayLocalTime(notification.createdAt, 'datetime')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 用戶頭像選單 */}
                <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 px-2 py-1.5 h-auto cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label="用户菜单"
                    >
                      <UserAvatar
                        avatar={userProfile?.avatar}
                        userName={
                          userProfile?.name ||
                          session.user.name ||
                          session.user.email ||
                          '用户'
                        }
                        size="sm"
                      />
                      <span className="hidden sm:block font-medium text-sm">
                        {userProfile?.name ||
                          session.user.name ||
                          session.user.email?.split('@')[0]}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {/* 用戶資訊頭 */}
                    <div className="px-4 py-3 border-b">
                      <p className="text-sm font-semibold">
                        {userProfile?.name || session.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {userProfile?.email || session.user.email}
                      </p>
                    </div>

                    <DropdownMenuItem asChild>
                      <Link
                        href="/user-center"
                        onClick={() => setIsMenuOpen(false)}
                        className="cursor-pointer"
                      >
                        <User className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        用户中心
                      </Link>
                    </DropdownMenuItem>

                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/admin"
                          onClick={() => setIsMenuOpen(false)}
                          className="cursor-pointer"
                        >
                          <Shield className="mr-2 h-4 w-4" strokeWidth={1.5} />
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
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

            ) : (
              /* 未登入 — 桌面登入/注冊按鈕 */
              <div className="hidden md:flex items-center gap-2">
                <Link href="/auth/signin">
                  <Button
                    variant="ghost"
                    className="cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    登录
                  </Button>
                </Link>
                {registrationEnabled && (
                  <Link href="/auth/register">
                    <Button className="cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                      注册
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
      {/* 注意：移除了舊的 <div className="h-16"> 佔位 div
          現在由 layout.tsx 的 <main className="pt-16"> 負責偏移 */}
    </>
  );
} 