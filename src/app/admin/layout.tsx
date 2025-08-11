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
  Calendar
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const navItems = [
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
      href: '/admin/settings', 
      label: '系统设置', 
      icon: Settings,
      description: ''
    },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
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
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.href, item.exact)}
                          className="group"
                        >
                          <Link href={item.href} className="flex items-center gap-3 px-6 py-3">
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
              <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                  3
                </span>
              </Button>
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