'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/UserAvatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
  BrainCircuit,
  FileText,
  Database,
  BarChart3,
  ChevronDown,
  BookOpen,
  MessageSquare,
} from 'lucide-react';
import { displayLocalTime } from '@/lib/frontend-time-utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Notification {
  _id: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
  relatedType?: 'post';
}

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const navLinks = [
  { href: '/', label: '首页', icon: Home },
  { href: '/knowledge', label: '知识库', icon: BookOpen },
  { href: '/events', label: '事件', icon: FileText },
];

const serviceLinks = [
  { href: '/resources', label: '资源', icon: Database },
  { href: '/reports', label: '报表', icon: BarChart3 },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // 临时分享页面不需要显示导航栏
  if (pathname?.startsWith('/share/')) return null;

  // 管理端（含仪表盘）不显示前台导航栏，由 admin layout 提供侧栏
  if (pathname?.startsWith('/admin')) return null;

  // UI state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Data state
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);

  const adminCheckCacheRef = useRef<Record<string, boolean>>({});
  const adminCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Registration status ───────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/system-parameters');
        if (res.ok) {
          const data = await res.json();
          if (data.success) setRegistrationEnabled(data.parameters.allowRegistration !== false);
        }
      } catch { setRegistrationEnabled(true); }
    };
    check();
  }, []);

  // ── Unread count poll (30 s) ───────────────────────────────────────────────
  useEffect(() => {
    const fetchCount = async () => {
      if (!session?.user?.email) { setUnreadCount(0); return; }
      try {
        const res = await fetch('/api/users/messages?page=1&limit=1');
        if (res.ok) { const d = await res.json(); setUnreadCount(d.unreadCount || 0); }
      } catch { /* ignore */ }
    };
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [session?.user?.email]);

  // ── Notifications: login / visibility / global event ─────────────────────
  useEffect(() => {
    if (session?.user?.email) fetchNotifications();
    else { setNotifications([]); setUnreadCount(0); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  useEffect(() => {
    const onVisible = () => { if (!document.hidden && session?.user?.email) fetchNotifications(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  useEffect(() => {
    const onUpdate = () => {
      if (!session?.user?.email) return;
      fetchNotifications();
      fetch('/api/users/messages?page=1&limit=1')
        .then(r => r.json())
        .then(d => setUnreadCount(d.unreadCount || 0))
        .catch(() => { /* ignore */ });
    };
    window.addEventListener('message-updated', onUpdate);
    return () => window.removeEventListener('message-updated', onUpdate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  // ── User profile ──────────────────────────────────────────────────────────
  const fetchUserProfile = async () => {
    if (!session?.user?.email) return;
    try {
      const res = await fetch('/api/users/profile');
      if (res.ok) setUserProfile(await res.json());
    } catch { /* ignore */ }
  };
  useEffect(() => { fetchUserProfile(); }, [session?.user?.email]); // eslint-disable-line

  useEffect(() => {
    const onAvatarChange = () => fetchUserProfile();
    window.addEventListener('avatar-changed', onAvatarChange);
    return () => window.removeEventListener('avatar-changed', onAvatarChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Admin check (debounced + 5 min cache) ────────────────────────────────
  useEffect(() => {
    const check = async () => {
      if (!session?.user?.email) { setIsAdmin(false); return; }
      const key = session.user.email;
      if (adminCheckCacheRef.current[key] !== undefined) {
        setIsAdmin(adminCheckCacheRef.current[key]); return;
      }
      if (adminCheckTimeoutRef.current) clearTimeout(adminCheckTimeoutRef.current);
      adminCheckTimeoutRef.current = setTimeout(async () => {
        try {
          const ok = (await fetch('/api/admin/dashboard')).ok;
          adminCheckCacheRef.current[key] = ok;
          setTimeout(() => { delete adminCheckCacheRef.current[key]; }, 5 * 60_000);
          setIsAdmin(ok);
        } catch { adminCheckCacheRef.current[key] = false; setIsAdmin(false); }
      }, 200);
    };
    check();
    return () => { if (adminCheckTimeoutRef.current) clearTimeout(adminCheckTimeoutRef.current); };
  }, [session?.user?.email]);

  // ── Sync unread count from notification list ──────────────────────────────
  useEffect(() => { setUnreadCount(notifications.filter(n => !n.isRead).length); }, [notifications]);

  // ── Notification handlers ─────────────────────────────────────────────────
  const fetchNotifications = async () => {
    if (!session?.user?.email || loadingNotifications) return;
    setLoadingNotifications(true);
    try {
      const res = await fetch('/api/users/messages?page=1&limit=10');
      if (res.ok) { const d = await res.json(); setNotifications(d.messages || []); setUnreadCount(d.unreadCount || 0); }
    } catch { /* ignore */ }
    finally { setLoadingNotifications(false); }
  };

  const markMessageAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/users/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: [id] }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(m => m._id === id ? { ...m, isRead: true } : m));
        setUnreadCount(prev => Math.max(0, prev - 1));
        window.dispatchEvent(new CustomEvent('message-updated'));
        setTimeout(() => setShowNotifications(false), 500);
      }
    } catch { /* ignore */ }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/users/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(m => ({ ...m, isRead: true })));
        setUnreadCount(0);
        window.dispatchEvent(new CustomEvent('message-updated'));
      }
    } catch { /* ignore */ }
  };

  // ── Route guard ───────────────────────────────────────────────────────────
  if (pathname?.startsWith('/auth/') || pathname?.startsWith('/admin/')) return null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isActive = (href: string) => href === '/' ? pathname === '/' : !!pathname?.startsWith(href);

  const linkCls = (href: string) =>
    cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
      'transition-all duration-200 cursor-pointer select-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      isActive(href)
        ? 'bg-primary/10 text-primary font-semibold shadow-sm'
        : [
            'text-muted-foreground hover:text-foreground',
            'hover:bg-white/70 dark:hover:bg-white/8',
            'hover:-translate-y-0.5 hover:shadow-sm',
          ],
    );

  const mobileLinkCls = (href: string) =>
    cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full',
      'transition-all duration-200 cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      isActive(href)
        ? 'bg-primary/10 text-primary font-semibold'
        : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/8',
    );

  // ─── Render ───────────────────────────────────────────────────────────────
  //
  // Layout:  fixed outer shell (full-width, provides top+side gap)
  //          ↳ floating glass pill (max-w-7xl, rounded-2xl, glass-navbar-pill)
  //
  // Outer pt-4 (16px) + pill h-14 (56px) = 72px total visual height
  // → layout.tsx <main> uses pt-[72px]
  //
  return (
    <div className="fixed top-0 inset-x-0 z-50 px-3 sm:px-5 lg:px-8 pt-4">
      <nav
        className={cn(
          'glass-navbar-pill is-scrolled',
          'max-w-7xl mx-auto rounded-2xl h-14',
          'flex items-center justify-between px-4 sm:px-5',
        )}
        role="navigation"
        aria-label="主导航"
      >
        {/* ── Left: Logo + Desktop nav ───────────────────────────────────── */}
        <div className="flex items-center gap-6 min-w-0">

          {/* Logo */}
          <Link
            href="/"
            className={cn(
              'flex items-center gap-2.5 flex-shrink-0 rounded-xl',
              'cursor-pointer transition-all duration-200 hover:-translate-y-0.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            )}
            aria-label="PonyMind 首页"
          >
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-sm ring-1 ring-primary/25 flex-shrink-0">
              <BrainCircuit className="w-4 h-4 text-primary-foreground" strokeWidth={1.5} />
            </div>
            <span className="font-heading font-bold text-[19px] text-primary tracking-tight leading-none">
              PonyMind
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-0.5" aria-label="主菜单">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={linkCls(href)}>
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>{label}</span>
              </Link>
            ))}

            {/* Services dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 h-auto text-sm font-medium rounded-lg',
                    'transition-all duration-200 cursor-pointer',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    (isActive('/resources') || isActive('/reports'))
                      ? 'bg-primary/10 text-primary font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/70 dark:hover:bg-white/8 hover:-translate-y-0.5',
                  )}
                >
                  <Settings className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span>服务</span>
                  <ChevronDown className="w-3 h-3 opacity-60" strokeWidth={1.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-44 rounded-xl border border-border/50 shadow-lg backdrop-blur-sm"
              >
                {serviceLinks.map(({ href, label, icon: Icon }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link href={href} className="flex items-center gap-2 w-full cursor-pointer rounded-lg">
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      <span>{label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        {/* ── Right: Actions ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <ThemeToggle />

          {/* Mobile hamburger — Sheet from LEFT */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:-translate-y-0.5 transition-all duration-200"
                aria-label="打开菜单"
              >
                <Menu className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            </SheetTrigger>
            {/* Glass sidebar */}
            <SheetContent
              side="left"
              className="glass-sheet w-[280px] sm:w-[320px] border-r border-white/20 dark:border-white/8 p-0"
            >
              <div className="flex flex-col h-full px-5 py-6">
                {/* Sheet logo */}
                <Link
                  href="/"
                  className="flex items-center gap-2.5 mb-8 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                >
                  <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                    <BrainCircuit className="w-4 h-4 text-primary-foreground" strokeWidth={1.5} />
                  </div>
                  <span className="font-heading font-bold text-[19px] text-primary tracking-tight leading-none">
                    PonyMind
                  </span>
                </Link>

                {/* Mobile links */}
                <nav className="space-y-0.5 flex-1" aria-label="移动端菜单">
                  {navLinks.map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href} className={mobileLinkCls(href)}>
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      <span>{label}</span>
                    </Link>
                  ))}
                  <div className="pt-4">
                    <p className="px-4 pb-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                      服务
                    </p>
                    {serviceLinks.map(({ href, label, icon: Icon }) => (
                      <Link key={href} href={href} className={mobileLinkCls(href)}>
                        <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                        <span>{label}</span>
                      </Link>
                    ))}
                  </div>
                </nav>

                <Separator className="my-4 opacity-30" />

                {/* Mobile guest auth */}
                {!session?.user && (
                  <div className="space-y-2">
                    <Link href="/auth/signin" className="block">
                      <Button variant="outline" className="w-full cursor-pointer focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
                        登录
                      </Button>
                    </Link>
                    {registrationEnabled && (
                      <Link href="/auth/register" className="block">
                        <Button className="w-full cursor-pointer focus-visible:ring-2 focus-visible:ring-primary rounded-xl shadow-sm">
                          注册
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* ── Authenticated ─────────────────────────────────────────────── */}
          {session?.user ? (
            <div className="flex items-center gap-1">

              {/* Notification bell */}
              <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:-translate-y-0.5 transition-all duration-200"
                    aria-label={`通知${unreadCount > 0 ? `，${unreadCount} 条未读` : ''}`}
                    onClick={fetchNotifications}
                  >
                    <Bell className="h-5 w-5" strokeWidth={1.5} />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-0.5 -right-0.5 h-4 w-4 min-w-0 rounded-full p-0 flex items-center justify-center text-[9px] font-bold"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-80 rounded-2xl border border-border/40 shadow-xl p-0 overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                    <h3 className="text-sm font-semibold">消息通知</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={markAllAsRead}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          全部已读
                        </Button>
                      )}
                      <Link
                        href="/user-center?section=messages"
                        onClick={() => setShowNotifications(false)}
                        className="text-xs text-primary hover:text-primary/80 transition-colors duration-150 cursor-pointer"
                      >
                        查看全部
                      </Link>
                    </div>
                  </div>

                  {/* List */}
                  <div className="max-h-72 overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="p-6 text-center">
                        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
                        <p className="text-xs text-muted-foreground mt-2">加载中…</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <MessageSquare className="w-9 h-9 text-muted-foreground/25 mx-auto mb-2" strokeWidth={1.5} />
                        <p className="text-sm text-muted-foreground">暂无新消息</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          role="button"
                          tabIndex={0}
                          className={cn(
                            'px-4 py-3 border-b last:border-0 border-border/20 cursor-pointer',
                            'transition-colors duration-150',
                            'focus-visible:outline-none focus-visible:bg-accent',
                            n.isRead ? 'hover:bg-accent/40' : 'bg-primary/5 hover:bg-primary/10',
                          )}
                          onClick={async () => {
                            if (!n.isRead) await markMessageAsRead(n._id);
                            if (n.relatedId && n.relatedType === 'post') {
                              setShowNotifications(false);
                              window.open(`/posts/${n.relatedId}`, '_blank');
                            } else {
                              setShowNotifications(false);
                              window.location.href = '/user-center?section=messages';
                            }
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click(); }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full mt-1.5 shrink-0',
                                n.isRead ? 'bg-muted-foreground/20' : 'bg-primary',
                              )}
                              aria-hidden
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.content}</p>
                              <p className="text-[10px] text-muted-foreground/50 mt-1">
                                {displayLocalTime(n.createdAt, 'datetime')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User dropdown */}
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-2 py-1.5 h-auto rounded-xl cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-200 hover:-translate-y-0.5"
                    aria-label="用户菜单"
                  >
                    <UserAvatar
                      avatar={userProfile?.avatar}
                      userName={userProfile?.name || session.user.name || session.user.email || '用户'}
                      size="sm"
                    />
                    <span className="hidden sm:block text-sm font-medium max-w-[6rem] truncate">
                      {userProfile?.name || session.user.name || session.user.email?.split('@')[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl border border-border/40 shadow-xl p-1.5"
                >
                  <div className="px-3 py-2.5 mb-1">
                    <p className="text-sm font-semibold">{userProfile?.name || session.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{userProfile?.email || session.user.email}</p>
                  </div>
                  <Separator className="mb-1.5 opacity-30" />
                  <DropdownMenuItem asChild>
                    <Link href="/user-center" onClick={() => setIsMenuOpen(false)} className="cursor-pointer rounded-xl">
                      <User className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      用户中心
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="cursor-pointer rounded-xl">
                        <Shield className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        管理后台
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="opacity-30 my-1" />
                  <DropdownMenuItem
                    onClick={() => { setIsMenuOpen(false); signOut({ callbackUrl: '/auth/signin' }); }}
                    className="text-destructive focus:text-destructive cursor-pointer rounded-xl"
                  >
                    <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            /* Guest buttons — desktop only */
            <div className="hidden md:flex items-center gap-2">
              <Link href="/auth/signin">
                <Button
                  variant="ghost"
                  className="cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl text-sm hover:-translate-y-0.5 transition-all duration-200"
                >
                  登录
                </Button>
              </Link>
              {registrationEnabled && (
                <Link href="/auth/register">
                  <Button className="cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl text-sm shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                    注册
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
