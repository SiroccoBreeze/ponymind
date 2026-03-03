'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import CreatePost from '@/components/CreatePost';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  BookOpen,
  MessageSquare,
  Users,
  TrendingUp,
  Sparkles,
  FileText,
  Calendar,
  Zap,
  Heart,
  Eye,
  Tag,
  Database,
  Rocket,
  BarChart3,
  Clock,
  FileBarChart,
  Plus,
  ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type StatsData = {
  hotPosts: Array<{
    _id: string;
    title: string;
    type: string;
    views: number;
    answers: number;
    likes: number;
    createdAt: string;
  }>;
  popularTags: Array<{ name: string; count: number }>;
  stats: {
    todayPosts: number;
    todayComments: number;
    unansweredQuestions: number;
  };
};

// ─── Static data (MASTER tokens only — no hardcoded hex) ──────────────────────
const features = [
  {
    icon: BookOpen,
    title: '知识库',
    description: '浏览和分享技术文章与问答',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    link: '/knowledge',
  },
  {
    icon: Calendar,
    title: '事件管理',
    description: '记录追踪重要事件与活动',
    iconBg: 'bg-sky-500/10',
    iconColor: 'text-sky-600 dark:text-sky-400',
    link: '/events',
  },
  {
    icon: Database,
    title: '资源中心',
    description: '收藏管理各类学习资源',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    link: '/resources',
  },
  {
    icon: FileBarChart,
    title: '报表中心',
    description: '查看报表和统计数据',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    link: '/reports',
  },
  {
    icon: Users,
    title: '社区互动',
    description: '与用户交流分享经验',
    iconBg: 'bg-secondary/10',
    iconColor: 'text-secondary',
    link: '/user-center',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<StatsData>({
    hotPosts: [],
    popularTags: [],
    stats: { todayPosts: 0, todayComments: 0, unansweredQuestions: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/stats');
        if (res.ok) setStats(await res.json());
      } catch (e) {
        console.error('获取数据失败:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePostCreated = () => {
    setShowCreatePost(false);
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => { /* ignore */ });
  };

  const quickActions = [
    {
      icon: FileText,
      label: '发布文章',
      description: '分享知识见解',
      action: () => setShowCreatePost(true),
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      icon: Zap,
      label: '立即提问',
      description: '寻求社区帮助',
      action: () => router.push('/ask'),
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      icon: Calendar,
      label: '查看事件',
      description: '浏览最新事件',
      action: () => router.push('/events'),
      iconBg: 'bg-sky-500/10',
      iconColor: 'text-sky-600 dark:text-sky-400',
    },
    {
      icon: Database,
      label: '浏览资源',
      description: '发现优质资源',
      action: () => router.push('/resources'),
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
  ];

  // ── Shared CTA button styles ──────────────────────────────────────────────
  // MASTER §2.1 --cta = Emerald-500, §8 button spec
  const ctaPrimary = cn(
    'bg-emerald-500 hover:bg-emerald-600 text-white font-semibold',
    'px-8 h-12 text-base rounded-xl cursor-pointer',
    'shadow-[0_4px_20px_rgba(16,185,129,0.28)] hover:shadow-[0_6px_28px_rgba(16,185,129,0.38)]',
    'transition-all duration-200 hover:-translate-y-0.5',
    'focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
  );
  const ctaSecondary = cn(
    'border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10',
    'font-semibold px-8 h-12 text-base rounded-xl cursor-pointer',
    'transition-all duration-200 hover:-translate-y-0.5',
    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">

      {/* ══════════════════════════════════════════════════════════════════════
          §1 Hero — two-column: text left, glass-light card right (desktop)
          Background: bg-background + gradient blobs (MASTER §1 AI Soft Glass)
          ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Decorative gradient blobs — MASTER §1: micro-glow, no neon */}
        <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -top-48 -right-32 w-[700px] h-[700px] rounded-full bg-primary/[0.06] blur-3xl" />
          <div className="absolute top-1/2 -left-48 w-[500px] h-[500px] rounded-full bg-secondary/[0.05] blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[300px] rounded-full bg-primary/[0.04] blur-2xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 sm:pt-16 lg:pb-28">
          <div className="grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-10 lg:gap-16 items-center">

            {/* ── Left: Text content ──────────────────────────────────────── */}
            <div>
              {/* Badge — MASTER §2.1 bg-primary/10 border-primary/20 */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                PonyMind 知识社区
              </div>

              {/* H1 — MASTER §3 font-heading, §3.2 text-5xl/6xl, §2.3 text-foreground */}
              <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-[1.08] tracking-tight mb-6">
                构建你的
                <br />
                {/* Accent word in text-primary — MASTER §2.1 */}
                <span className="text-primary">知识宇宙</span>
              </h1>

              {/* Description — MASTER §9: leading-relaxed, text-muted-foreground */}
              <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed max-w-xl mb-10">
                集<strong className="text-foreground font-semibold">知识分享</strong>、
                <strong className="text-foreground font-semibold">问答交流</strong>、
                <strong className="text-foreground font-semibold">事件管理</strong>和
                <strong className="text-foreground font-semibold">资源收藏</strong>于一体的综合平台
              </p>

              {/* CTA buttons — MASTER §8, §2.1 --cta = Emerald */}
              <div className="flex flex-col sm:flex-row gap-4">
                {session ? (
                  <>
                    <Button size="lg" className={ctaPrimary} onClick={() => router.push('/knowledge')}>
                      进入知识库
                      <ArrowRight className="w-5 h-5 ml-2" strokeWidth={1.5} />
                    </Button>
                    <Button size="lg" variant="outline" className={ctaSecondary} onClick={() => setShowCreatePost(true)}>
                      <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                      发布内容
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="lg" className={ctaPrimary} onClick={() => router.push('/auth/signin')}>
                      免费加入社区
                      <ArrowRight className="w-5 h-5 ml-2" strokeWidth={1.5} />
                    </Button>
                    <Button size="lg" variant="outline" className={ctaSecondary} onClick={() => router.push('/knowledge')}>
                      <BookOpen className="w-5 h-5 mr-2" strokeWidth={1.5} />
                      浏览内容
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* ── Right: glass-light info card (desktop only) ─────────────── */}
            <div className="hidden lg:block">
              {/* MASTER §6.3 glass-light card */}
              <div className="glass-light rounded-3xl p-7">
                {/* Card header */}
                <div className="flex items-center gap-3 pb-5 mb-5 border-b border-border/40">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm flex-shrink-0 ring-1 ring-primary/25">
                    <Sparkles className="w-5 h-5 text-primary-foreground" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-foreground leading-none mb-0.5">PonyMind</p>
                    <p className="text-xs text-muted-foreground">AI 驱动知识社区平台</p>
                  </div>
                </div>

                {/* Feature highlights */}
                <div className="space-y-1.5">
                  {[
                    { icon: BookOpen, title: '知识库', desc: '技术文章 · 问答交流', cls: 'bg-primary/10 text-primary' },
                    { icon: Calendar, title: '事件管理', desc: '记录追踪重要事件', cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
                    { icon: Database, title: '资源中心', desc: '收藏整理学习资源', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                    { icon: TrendingUp, title: '社区动态', desc: '热门内容 · 精选话题', cls: 'bg-secondary/10 text-secondary' },
                  ].map(({ icon: Icon, title, desc, cls }) => (
                    <div
                      key={title}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-background/60 dark:hover:bg-white/5 transition-colors duration-200"
                    >
                      <div className={cn('p-2 rounded-lg flex-shrink-0', cls)}>
                        <Icon className="w-4 h-4" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-none mb-0.5">{title}</p>
                        <p className="text-xs text-muted-foreground truncate">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live mini stats — MASTER §3.3 font-heading tabular-nums */}
                <div className="mt-5 pt-5 border-t border-border/40 grid grid-cols-3 gap-2 text-center">
                  {[
                    { value: stats.stats.todayPosts, label: '今日内容', color: 'text-primary' },
                    { value: stats.stats.todayComments, label: '今日回答', color: 'text-sky-600 dark:text-sky-400' },
                    { value: stats.stats.unansweredQuestions, label: '待解决', color: 'text-amber-600 dark:text-amber-400' },
                  ].map(({ value, label, color }) => (
                    <div key={label} className="p-2 rounded-xl bg-background/50">
                      {isLoading ? (
                        <Skeleton className="h-7 w-10 mx-auto mb-1" />
                      ) : (
                        <p className={cn('text-xl font-heading font-bold tabular-nums', color)}>{value}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          §2 Stats Strip — mobile/tablet only (desktop sees stats in hero card)
          glass-light cards with semantic icon badges
          ══════════════════════════════════════════════════════════════════ */}
      <section className="lg:hidden max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: '今日新内容', value: stats.stats.todayPosts, icon: FileText, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
            { label: '今日新回答', value: stats.stats.todayComments, icon: MessageSquare, iconBg: 'bg-sky-500/10', iconColor: 'text-sky-600 dark:text-sky-400' },
            { label: '待解决问题', value: stats.stats.unansweredQuestions, icon: Zap, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
          ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
            <div key={label} className="glass-light rounded-2xl p-5 flex items-center gap-4">
              <div className={cn('p-3 rounded-xl flex-shrink-0', iconBg)}>
                <Icon className={cn('w-6 h-6', iconColor)} strokeWidth={1.5} />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-14 mb-1" />
                ) : (
                  <p className="font-heading text-3xl font-bold tabular-nums text-foreground leading-none">{value}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          §3 Feature Categories — glass-light cards, MASTER token icon badges
          ══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          {/* MASTER §2.1 text-primary for section label */}
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">探索功能</p>
          <h2 className="font-heading text-4xl sm:text-5xl font-bold text-foreground">
            一切你需要的，都在这里
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {features.map(({ icon: Icon, title, description, iconBg, iconColor, link }) => (
            <Link
              key={title}
              href={link}
              className="group glass-light rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <div className={cn('p-3 rounded-xl w-fit', iconBg)}>
                <Icon className={cn('w-6 h-6', iconColor)} strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-base text-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
              <ChevronRight
                className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 mt-auto"
                strokeWidth={1.5}
              />
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          §4 Quick Actions — authenticated only, glass-light cards
          ══════════════════════════════════════════════════════════════════ */}
      {session && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">快捷操作</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">立即开始行动</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map(({ icon: Icon, label, description, action, iconBg, iconColor }) => (
              <button
                key={label}
                onClick={action}
                className="group glass-light rounded-2xl p-6 text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className={cn('p-3 rounded-xl w-fit mb-4', iconBg)}>
                  <Icon className={cn('w-6 h-6', iconColor)} strokeWidth={1.5} />
                </div>
                <h3 className="font-heading font-semibold text-base text-foreground mb-1">{label}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          §5 Hot Content & Popular Tags — bg-card surface cards (content-heavy,
          needs higher readability; glass reserved for decorative elements)
          ══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">社区动态</p>
          <h2 className="font-heading text-4xl sm:text-5xl font-bold text-foreground">发现精彩内容</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Hot Posts */}
          <div className="bg-card rounded-3xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-base text-foreground">热门内容</h3>
                  <p className="text-xs text-muted-foreground">最受欢迎的文章和问题</p>
                </div>
              </div>
              <Badge className="bg-primary/10 text-primary border-0 text-xs font-semibold px-3 py-1">
                <BarChart3 className="w-3 h-3 mr-1" strokeWidth={1.5} />
                实时
              </Badge>
            </div>

            <div className="space-y-1.5">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl bg-muted/40">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))
                : stats.hotPosts.length > 0
                ? stats.hotPosts.slice(0, 5).map((post, index) => (
                    <Link
                      key={post._id}
                      href={`/posts/${post._id}`}
                      className="flex items-start gap-4 p-3.5 rounded-xl hover:bg-accent/50 transition-all duration-200 cursor-pointer group border border-transparent hover:border-border"
                    >
                      <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200 tabular-nums">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 text-sm mb-1.5">
                          {post.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" strokeWidth={1.5} />
                            {post.views}
                          </span>
                          {post.type === 'question' && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" strokeWidth={1.5} />
                              {post.answers}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" strokeWidth={1.5} />
                            {post.likes}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))
                : (
                  <div className="text-center py-14 text-muted-foreground">
                    <TrendingUp className="w-11 h-11 mx-auto mb-3 opacity-25" strokeWidth={1.5} />
                    <p className="text-sm">暂无热门内容</p>
                  </div>
                )}
            </div>
          </div>

          {/* Popular Tags */}
          <div className="bg-card rounded-3xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-secondary/10">
                  <Tag className="w-5 h-5 text-secondary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-base text-foreground">热门标签</h3>
                  <p className="text-xs text-muted-foreground">探索社区关注的话题</p>
                </div>
              </div>
              <Badge className="bg-secondary/10 text-secondary border-0 text-xs font-semibold px-3 py-1">
                <Clock className="w-3 h-3 mr-1" strokeWidth={1.5} />
                本周
              </Badge>
            </div>

            <div className="space-y-1.5">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-12 rounded-full" />
                    </div>
                  ))
                : stats.popularTags.length > 0
                ? stats.popularTags.slice(0, 8).map((tag) => (
                    <Link
                      key={tag.name}
                      href={`/knowledge?tag=${tag.name}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-accent/50 transition-all duration-200 cursor-pointer group border border-transparent hover:border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-secondary/10 group-hover:bg-secondary transition-colors duration-200">
                          <Tag className="w-3.5 h-3.5 text-secondary group-hover:text-secondary-foreground transition-colors duration-200" strokeWidth={1.5} />
                        </div>
                        <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                          {tag.name}
                        </span>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/10 text-secondary tabular-nums">
                        {tag.count}
                      </span>
                    </Link>
                  ))
                : (
                  <div className="text-center py-14 text-muted-foreground">
                    <Tag className="w-11 h-11 mx-auto mb-3 opacity-25" strokeWidth={1.5} />
                    <p className="text-sm">暂无标签数据</p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          §6 Bottom CTA — unauthenticated only
          glass-light card + gradient blobs (MASTER §6.3, §2.1)
          ══════════════════════════════════════════════════════════════════ */}
      {!session && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
          <div className="relative overflow-hidden glass-light rounded-3xl p-12 sm:p-16 text-center">
            {/* Gradient blobs inside card */}
            <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/[0.07] blur-3xl -translate-y-1/3 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-secondary/[0.07] blur-3xl translate-y-1/3 -translate-x-1/4" />
            </div>

            <div className="relative">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
                <Rocket className="w-4 h-4" strokeWidth={1.5} />
                开始你的旅程
              </div>

              {/* Heading */}
              <h2 className="font-heading text-4xl sm:text-5xl font-bold text-foreground mb-6 leading-tight">
                准备好加入了吗？
              </h2>

              {/* Description — MASTER §9 */}
              <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed mb-10">
                加入 PonyMind 社区，开始你的知识管理之旅，与数百位用户一起学习和成长
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className={ctaPrimary} onClick={() => router.push('/auth/signin')}>
                  立即注册，免费加入
                  <ArrowRight className="w-5 h-5 ml-2" strokeWidth={1.5} />
                </Button>
                <Button size="lg" variant="outline" className={ctaSecondary} onClick={() => router.push('/knowledge')}>
                  <BookOpen className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  先浏览内容
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
}
