'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SchedulerInitializer from '@/components/SchedulerInitializer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Tags, 
  Settings, 
  Home,
  LogOut,
  User,
  Shield,
  Bell,
  ChevronRight,
  Crown,
  MessageSquare,
  Calendar,
  Database,
  FolderOpen,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  href?: string;
  key?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  description: string;
  children?: NavItem[];
}

interface AdminMessage {
  _id: string;
  type: 'info' | 'success' | 'rejection' | 'warning' | 'comment_reply' | 'post_like' | 'comment_like';
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
  relatedType?: 'post' | 'comment' | 'user';
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<AdminMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

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

  // 自动展开当前页面对应的菜单
  useEffect(() => {
    if (pathname.startsWith('/admin/resources') || pathname.startsWith('/admin/resource-categories')) {
      setExpandedMenus(prev => new Set([...prev, 'resources']));
    }
  }, [pathname]);

  // 获取管理员消息通知
  const fetchAdminNotifications = async () => {
    if (!session?.user?.email || loadingNotifications) return;

    setLoadingNotifications(true);
    try {
      const response = await fetch('/api/admin/messages?page=1&limit=10');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.messages || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('获取管理员消息失败:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // 标记消息为已读
  const markMessageAsRead = async (messageId: string) => {
    try {
      const response = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messageIds: [messageId] 
        }),
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, isRead: true }
            : msg
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
        
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
      const response = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      
      if (response.ok) {
        setUnreadCount(0);
        setNotifications(prev => prev.map(msg => ({ ...msg, isRead: true })));
        setShowNotifications(false);
      }
    } catch (error) {
      console.error('标记所有消息已读失败:', error);
    }
  };

  // 初始加载消息
  useEffect(() => {
    if (isAuthorized) {
      fetchAdminNotifications();
    }
  }, [isAuthorized]);

  // 定期刷新消息
  useEffect(() => {
    if (!isAuthorized) return;
    
    const interval = setInterval(() => {
      fetchAdminNotifications();
    }, 30000); // 每30秒刷新一次

    return () => clearInterval(interval);
  }, [isAuthorized]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">正在验证权限...</p>
            <p className="text-sm text-muted-foreground">请稍候，正在检查管理员权限</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const toggleMenu = (menuKey: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuKey)) {
        newSet.delete(menuKey);
      } else {
        newSet.add(menuKey);
      }
      return newSet;
    });
  };

  const navItems: NavItem[] = [
    { 
      href: '/admin', 
      label: '仪表板', 
      icon: LayoutDashboard, 
      exact: true,
      description: ''
    },
    { 
      href: '/admin/users', 
      label: '用户管理', 
      icon: Users,
      description: ''
    },
    { 
      href: '/admin/posts', 
      label: '内容管理', 
      icon: FileText,
      description: ''
    },
    { 
      href: '/admin/events', 
      label: '事件管理', 
      icon: Calendar,
      description: ''
    },
    {
      key: 'resources',
      label: '资源管理',
      icon: Database,
      description: '',
      children: [
        {
          href: '/admin/resources',
          label: '资源列表',
          icon: Database,
          description: ''
        },
        {
          href: '/admin/resource-categories',
          label: '资源分类',
          icon: FolderOpen,
          description: ''
        }
      ]
    },
    { 
      href: '/admin/comments', 
      label: '评论管理', 
      icon: MessageSquare,
      description: ''
    },
    { 
      href: '/admin/tags', 
      label: '标签管理', 
      icon: Tags,
      description: ''
    },
    { 
      href: '/admin/messages', 
      label: '消息管理', 
      icon: MessageSquare,
      description: ''
    },
    { 
      href: '/admin/logs', 
      label: '系统日志', 
      icon: FileText,
      description: ''
    },
    {
      key: 'settings',
      label: '系统设置',
      icon: Settings,
      description: '',
      children: [
        {
          href: '/admin/settings',
          label: '参数配置',
          icon: Settings,
          description: ''
        },
        {
          href: '/admin/scheduled-tasks',
          label: '定时任务',
          icon: Bell,
          description: ''
        }
      ]
    },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return '刚刚';
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r">
          <SidebarHeader className="border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <Crown className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold text-lg">PonyMind</span>
                <span className="truncate text-xs text-muted-foreground font-medium">管理后台</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                主要功能
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    
                    // 如果有子菜单
                    if ('children' in item && item.children) {
                      const isExpanded = expandedMenus.has(item.key || '');
                      const hasActiveChild = item.children.some(child => isActive(child.href || ''));
                      
                      return (
                        <div key={item.key || 'menu'}>
                          {/* 父菜单项 */}
                          <SidebarMenuItem>
                            <SidebarMenuButton
                              onClick={() => toggleMenu(item.key || '')}
                              isActive={hasActiveChild}
                              className="group w-full flex items-center gap-3 px-6 py-3"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 group-hover:bg-primary/10 group-data-[active=true]:bg-primary/20 transition-colors">
                                <Icon className="h-4 w-4 group-data-[active=true]:text-primary" />
                              </div>
                              <div className="flex-1 text-left">
                                <div className="font-medium group-data-[active=true]:text-primary">
                                  {item.label}
                                </div>
                                <div className="text-xs text-muted-foreground hidden group-hover:block group-data-[active=true]:block">
                                  {item.description}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-data-[active=true]:text-primary transition-transform group-hover:translate-x-1" />
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          
                          {/* 子菜单项 */}
                          {isExpanded && item.children.map((child) => {
                            const ChildIcon = child.icon;
                            return (
                              <SidebarMenuItem key={child.href || 'child'}>
                                <SidebarMenuButton
                                  asChild
                                  isActive={isActive(child.href || '')}
                                  className="group"
                                >
                                  <Link href={child.href || '#'} className="flex items-center gap-3 px-6 py-2 ml-6">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/30 group-hover:bg-primary/10 group-data-[active=true]:bg-primary/20 transition-colors">
                                      <ChildIcon className="h-3 w-3 group-data-[active=true]:text-primary" />
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className="text-sm font-medium group-data-[active=true]:text-primary">
                                        {child.label}
                                      </div>
                                    </div>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </div>
                      );
                    }
                    
                    // 普通菜单项
                    return (
                      <SidebarMenuItem key={item.href || 'item'}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.href || '', item.exact)}
                          className="group"
                        >
                          <Link href={item.href || '#'} className="flex items-center gap-3 px-6 py-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 group-hover:bg-primary/10 group-data-[active=true]:bg-primary/20 transition-colors">
                              <Icon className="h-4 w-4 group-data-[active=true]:text-primary" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium group-data-[active=true]:text-primary">
                                {item.label}
                              </div>
                              <div className="text-xs text-muted-foreground hidden group-hover:block group-data-[active=true]:block">
                                {item.description}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-data-[active=true]:text-primary transition-transform group-hover:translate-x-1" />
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarGroup>
              <SidebarGroupLabel className="px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                快捷操作
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/" className="flex items-center gap-3 px-6 py-3 group">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 group-hover:bg-blue-100 transition-colors">
                          <Home className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="font-medium">返回前台</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/profile" className="flex items-center gap-3 px-6 py-3 group">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 group-hover:bg-green-100 transition-colors">
                          <User className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="font-medium">个人资料</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t px-6 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={session?.user?.image || undefined} alt="用户头像" />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                  {session?.user?.name?.charAt(0).toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{session?.user?.name}</span>
                <span className="truncate text-xs text-muted-foreground">{session?.user?.email}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>管理员账户</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/api/auth/signout" className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      退出登录
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                  <Shield className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm font-medium">管理后台</span>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 px-4">
              {/* 消息通知按钮 */}
              <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between p-2 border-b">
                    <DropdownMenuLabel className="text-base">消息通知</DropdownMenuLabel>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllMessagesAsRead}
                        className="h-6 px-2 text-xs"
                      >
                        全部已读
                      </Button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto mb-2"></div>
                        加载中...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>暂无消息</p>
                      </div>
                    ) : (
                      notifications.map((message) => (
                        <DropdownMenuItem
                          key={message._id}
                          className="flex flex-col items-start p-3 cursor-pointer hover:bg-muted/50"
                          onClick={() => markMessageAsRead(message._id)}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className={`flex-shrink-0 mt-1 ${
                              message.type === 'rejection' ? 'text-red-500' :
                              message.type === 'success' ? 'text-green-500' :
                              message.type === 'warning' ? 'text-yellow-500' :
                              'text-blue-500'
                            }`}>
                              {message.type === 'rejection' ? <AlertCircle className="h-4 w-4" /> :
                               message.type === 'success' ? <CheckCircle className="h-4 w-4" /> :
                               message.type === 'warning' ? <AlertCircle className="h-4 w-4" /> :
                               <MessageSquare className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`text-sm font-medium ${!message.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {message.title}
                                </p>
                                {!message.isRead && (
                                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                                {message.content}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="w-full h-8 text-xs"
                      >
                        <Link href="/admin/messages">
                          查看全部消息
                        </Link>
                      </Button>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Badge variant="secondary" className="text-xs font-medium bg-gradient-to-r from-primary/10 to-primary/20 text-primary border-primary/20">
                v1.0.0
              </Badge>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
            {children}
          </div>
        </SidebarInset>
      </div>
      
      {/* 调度器初始化组件 */}
      <SchedulerInitializer />
    </SidebarProvider>
  );
} 