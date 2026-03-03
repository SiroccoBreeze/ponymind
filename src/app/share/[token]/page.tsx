'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { displayLocalTime } from '@/lib/frontend-time-utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  BrainCircuit,
  Clock,
  Eye,
  Heart,
  MessageSquare,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Lock,
} from 'lucide-react';

// 动态导入 —— 与 post 详情页保持一致
const MarkdownPreview = dynamic(() => import('@/components/MarkdownPreview'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-muted h-64 rounded-lg" />,
});
const TableOfContents = dynamic(() => import('@/components/TableOfContents'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-muted h-32 rounded-lg" />,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface SharedPost {
  _id: string;
  title: string;
  content: string;
  summary: string;
  type: 'article' | 'question';
  tags: string[];
  views: number;
  likes: number;
  answers: number;
  status?: string;
  difficulty?: string;
  createdAt: string;
  updatedAt: string;
  author: {
    name: string;
    email: string;
    avatar?: string;
  };
}

interface ShareInfo {
  expiresAt: string;
  ttlDays: number;
  accessCount: number;
}

interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    avatar?: string;
  };
  parentComment?: {
    _id: string;
    author: { name: string };
  } | null;
  likes: number;
  isAccepted?: boolean;
  images?: string[];
  replies?: Comment[];
  createdAt: string;
}

type PageState =
  | { status: 'loading' }
  | { status: 'ok'; post: SharedPost; shareInfo: ShareInfo }
  | { status: 'error'; message: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** 将 /api/images/xxx 转为分享专用 URL，供未登录用户加载图片（含头像） */
function toShareImageUrl(url: string, shareToken: string): string {
  if (!url) return url;
  if (url.startsWith('/api/images/')) {
    return `/api/share/${shareToken}/images/${url.replace('/api/images/', '')}`;
  }
  try {
    const u = new URL(url);
    if (u.pathname.startsWith('/api/images/')) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return `${origin}/api/share/${shareToken}/images/${u.pathname.replace('/api/images/', '')}`;
    }
  } catch {
    /* ignore */
  }
  return url;
}

function expiresLabel(expiresAt: string) {
  const hours = Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))
  );
  if (hours === 0) return '即将过期';
  if (hours < 24) return `${hours}h 后过期`;
  return `${Math.ceil(hours / 24)}天后过期`;
}

// ── Read-only Comment Tree（与正常页面展示一致）──────────────────────────────────

function CommentItem({
  comment,
  depth = 0,
  shareToken,
  parentAuthor,
}: {
  comment: Comment;
  depth?: number;
  shareToken?: string;
  parentAuthor?: string | null;
}) {
  const isTopLevel = depth === 0;
  const imgSrc = (src: string) => (shareToken ? toShareImageUrl(src, shareToken) : src);

  const wrapperCls = isTopLevel
    ? `border-b border-border pb-6 last:border-b-0 rounded-xl p-5 transition-colors duration-200 ${
        comment.isAccepted
          ? 'bg-emerald-50/80 dark:bg-emerald-950/25 border-2 border-emerald-200 dark:border-emerald-800/60 shadow-[0_4px_16px_rgba(16,185,129,0.08)] dark:shadow-[0_4px_16px_rgba(52,211,153,0.06)]'
          : ''
      }`
    : 'bg-accent/30 rounded-lg p-3 hover:bg-accent/50 transition-colors';

  return (
    <div className={wrapperCls}>
      <div className="flex items-start space-x-3">
        <Avatar
          className={`shrink-0 ${
            isTopLevel ? 'w-10 h-10' : 'w-8 h-8'
          } ${comment.isAccepted ? 'ring-2 ring-offset-2 ring-emerald-300 dark:ring-emerald-700 ring-offset-background' : ''}`}
        >
          <AvatarImage
            src={comment.author.avatar && shareToken ? toShareImageUrl(comment.author.avatar, shareToken) : comment.author.avatar}
            alt={comment.author.name}
          />
          <AvatarFallback className="text-xs">
            {comment.author.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-medium text-foreground">{comment.author.name}</h3>
            <time className="text-xs text-muted-foreground">
              {displayLocalTime(comment.createdAt, 'datetime')}
            </time>
            {comment.isAccepted && (
              <Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                最佳答案
              </Badge>
            )}
          </div>

          <div className="mb-3">
            {parentAuthor && parentAuthor !== comment.author.name && (
              <span className="text-primary font-medium text-sm">@{parentAuthor}：</span>
            )}
            <MarkdownPreview content={comment.content} />
          </div>

          {comment.images && comment.images.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {comment.images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={imgSrc(src)}
                  alt={`附图 ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-border"
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Heart className="w-3.5 h-3.5" />
            <span>{comment.likes}</span>
          </div>
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 ml-4 pl-4 border-l-2 border-primary/20 space-y-4">
          {comment.replies.map((reply) => {
            const pa = reply.parentComment?.author?.name ?? comment.author.name;
            return (
              <CommentItem
                key={reply._id}
                comment={reply}
                depth={depth + 1}
                shareToken={shareToken}
                parentAuthor={pa}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [comments, setComments] = useState<Comment[]>([]);
  const [readProgress, setReadProgress] = useState(0);
  const [isTocFixed, setIsTocFixed] = useState(true);

  // 读取分享内容
  useEffect(() => {
    if (!token) return;
    fetch(`/api/share/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) setState({ status: 'error', message: data.error || '访问失败' });
        else setState({ status: 'ok', post: data.post, shareInfo: data.shareLink });
      })
      .catch(() => setState({ status: 'error', message: '网络错误，请稍后重试' }));
  }, [token]);

  // 加载评论（无需登录），排序与正常页面一致：最佳答案置顶，其余按最新
  useEffect(() => {
    if (state.status !== 'ok') return;
    fetch(`/api/posts/${state.post._id}/comments`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          const raw = data.comments || [];
          const sorted = [...raw].sort((a: Comment, b: Comment) => {
            if (a.isAccepted && !b.isAccepted) return -1;
            if (!a.isAccepted && b.isAccepted) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          setComments(sorted);
        }
      })
      .catch(() => {});
  }, [state]);

  // 阅读进度条
  useEffect(() => {
    const handle = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setReadProgress(max > 0 ? Math.min((window.scrollY / max) * 100, 100) : 0);
    };
    window.addEventListener('scroll', handle);
    return () => window.removeEventListener('scroll', handle);
  }, []);

  // 目录：评论区进入视口时取消固定（与正常页面一致）
  useEffect(() => {
    const el = document.getElementById('comments-section');
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setIsTocFixed(!entry.isIntersecting));
      },
      { rootMargin: '-100px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [state]);

  const hasToC = useMemo(() => {
    if (state.status !== 'ok') return false;
    return /^#{1,6}\s/m.test(state.post.content);
  }, [state]);

  const rawContent = state.status === 'ok' ? state.post.content : '';
  const displayContent = useMemo(
    () => (rawContent ? rawContent.replace(/\/api\/images\//g, `/api/share/${token}/images/`) : ''),
    [rawContent, token]
  );

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">正在加载内容…</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">链接无法访问</h1>
          <p className="text-muted-foreground mb-6">{state.message}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <BrainCircuit className="w-4 h-4" />
            返回 PonyMind 首页
          </Link>
        </div>
      </div>
    );
  }

  const { post, shareInfo } = state;

  return (
    <div className="min-h-screen bg-background">
      {/* ── 阅读进度条（最顶层）── */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-primary/10 z-[60]">
        <div
          className="h-full bg-primary transition-all duration-150 ease-out"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* ── 浮动胶囊导航栏（与主 Navbar 同款玻璃态）── */}
      <div className="fixed top-0 left-0 right-0 z-50 pt-4 px-3 sm:px-5 lg:px-8">
        <nav className="glass-navbar-pill is-scrolled max-w-7xl mx-auto rounded-2xl h-14 flex items-center justify-between px-4 sm:px-6">
          {/* 左：品牌 */}
          <Link
            href="/"
            className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
          >
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-[0_2px_8px_rgba(58,127,245,0.30)]">
              <BrainCircuit className="w-4 h-4 text-primary-foreground" strokeWidth={1.5} />
            </div>
            <span className="font-heading font-bold text-base hidden sm:block">PonyMind</span>
          </Link>

          {/* 右：信息区 */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* 到期时间 */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>{expiresLabel(shareInfo.expiresAt)}</span>
            </div>

            {/* 浏览次数 */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-lg">
              <Eye className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{shareInfo.accessCount} 次浏览</span>
            </div>

            {/* 原文链接 */}
            <Link
              href={`/posts/${post._id}`}
              target="_blank"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden xs:inline">原文</span>
            </Link>

            {/* 分隔 */}
            <div className="w-px h-4 bg-border/60 mx-1 hidden sm:block" />

            {/* 主题切换 */}
            <ThemeToggle />
          </div>
        </nav>
      </div>

      {/* ── 主体（pt-[72px] 与主 Navbar 同高，为浮动胶囊留空）── */}
      <div className="pt-[72px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* ── 主内容 ── */}
          <div className="flex-1 min-w-0">
            {/* 文章标题区 */}
            <header className="mb-8">
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-5">
                {post.title}
              </h1>

              {/* 作者 + 时间 + 统计 */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarImage
                      src={post.author.avatar ? toShareImageUrl(post.author.avatar, token) : undefined}
                      alt={post.author.name}
                    />
                    <AvatarFallback className="text-sm">
                      {post.author.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{post.author.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {displayLocalTime(post.createdAt, 'datetime')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{post.views}</span>
                  <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{post.likes}</span>
                  {post.type === 'question' && (
                    <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" />{post.answers}</span>
                  )}
                </div>
              </div>

              {/* 标签 */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* 正文（图片 URL 已转为分享专用，无需登录可加载） */}
            <article className="prose prose-lg max-w-none mb-12">
              <MarkdownPreview content={displayContent || post.content} />
            </article>

            {/* ── 评论区（只读） ── */}
            <section id="comments-section" className="border-t border-border pt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground font-heading">
                  {post.type === 'question'
                    ? `${comments.length} 个回答`
                    : `${comments.length} 条评论`}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full">
                  <Lock className="w-3 h-3" />
                  <span>仅供查看</span>
                </div>
              </div>

              {comments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  暂无{post.type === 'question' ? '回答' : '评论'}
                </div>
              ) : (
                <div className="space-y-0">
                  {comments.map((comment) => (
                    <CommentItem key={comment._id} comment={comment} shareToken={token} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── 右侧目录 ──
              与正常文章页完全一致：
              - flex 容器默认 stretch，aside 高度 = 主内容高度，sticky 有足够滚动空间
              - 不加 overflow-y-auto，避免创建新的滚动上下文（会破坏 sticky 相对视口定位）
              - top-24 对应浮动胶囊高度 72px + 视觉间距 */}
          {hasToC && (
            <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0">
              <div
                className={`top-24 max-h-[calc(100vh-6rem)] transition-all duration-300 ${
                  isTocFixed ? 'sticky' : 'relative'
                }`}
              >
                <div className="px-4">
                  <TableOfContents content={displayContent} readProgress={readProgress} />
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
