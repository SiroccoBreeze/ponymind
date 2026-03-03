'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { displayLocalTime } from '@/lib/frontend-time-utils';
import {
  ChevronRight,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  ArrowUp,
  ChevronDown,
  CheckCircle2,
  X,
} from 'lucide-react';

// 动态导入组件，避免 SSR 问题
const MarkdownPreview = dynamic(() => import('@/components/MarkdownPreview'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-muted h-64 rounded-lg" />,
});
const TableOfContents = dynamic(() => import('@/components/TableOfContents'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-muted h-32 rounded-lg" />,
});
const CommentInput = dynamic(() => import('@/components/CommentInput'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-muted h-32 rounded-lg" />,
});
const ReplyInput = dynamic(() => import('@/components/ReplyInput'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-muted h-20 rounded-lg" />,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface Post {
  _id: string;
  title: string;
  content: string;
  summary: string;
  type: 'article' | 'question';
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  tags: string[];
  views: number;
  likes: number;
  answers: number;
  acceptedAnswer?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  status?: 'open' | 'answered' | 'closed';
  bounty?: number;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    avatar?: string;
  };
  likes: number;
  likedBy?: string[];
  isAccepted?: boolean;
  images?: string[];
  replies?: Comment[];
  parentComment?: string;
  createdAt: string;
}

// ── 图片弹窗 ─────────────────────────────────────────────────────────────────

function ImagePreviewModal({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="关闭预览"
        className="absolute top-5 right-6 z-[81] text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
      >
        <X className="w-6 h-6" strokeWidth={1.5} />
      </button>
      <div
        className="flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || '图片'}
          className="rounded-xl max-w-[85vw] max-h-[82vh] object-contain shadow-2xl"
        />
        {alt && (
          <span className="mt-4 text-white/80 text-sm bg-black/50 px-4 py-1.5 rounded-full max-w-md text-center">
            {alt}
          </span>
        )}
      </div>
    </div>
  );
}

// ── 状态徽章 ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    open: {
      label: '待解决',
      cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    },
    answered: {
      label: '已解决',
      cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    },
    closed: {
      label: '已关闭',
      cls: 'bg-muted text-muted-foreground border-border',
    },
  };
  const item = config[status];
  if (!item) return null;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.cls}`}
    >
      {item.label}
    </span>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [processingAnswer, setProcessingAnswer] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewAlt, setPreviewAlt] = useState<string | undefined>(undefined);
  const [readProgress, setReadProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isTocFixed, setIsTocFixed] = useState(true);
  const [commentSortBy, setCommentSortBy] = useState<'newest' | 'hottest'>('newest');
  const [replyToAuthor, setReplyToAuthor] = useState<string>('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const postId = params?.id as string;

  // 监听滚动 → 阅读进度 + 返回顶部显隐
  useEffect(() => {
    const handle = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setReadProgress(max > 0 ? Math.min((window.scrollY / max) * 100, 100) : 0);
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handle);
    handle();
    return () => window.removeEventListener('scroll', handle);
  }, []);

  // 评论区进入视口 → 取消目录固定
  useEffect(() => {
    const el = document.getElementById('comments-section');
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => setIsTocFixed(!e.isIntersecting)),
      { rootMargin: '-100px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [post]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToComments = () =>
    document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Memoized
  const hasTableOfContents = useMemo(() => /^#{1,6}\s/m.test(post?.content || ''), [post?.content]);
  const stableContent = useMemo(() => post?.content || '', [post?.content]);
  const isQuestionAuthor = useMemo(
    () =>
      post?.type === 'question' &&
      !!session?.user?.email &&
      post?.author?.email === session.user.email,
    [post, session]
  );

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    try {
      const res = await fetch(`/api/posts/${postId}`);
      if (res.ok) setPost(await res.json());
      else if (res.status === 404) router.push('/404');
    } catch (e) {
      console.error('获取文章失败:', e);
    }
  }, [postId, router]);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (!res.ok) return;
      const data = await res.json();
      const sorted = (data.comments || []).sort((a: Comment, b: Comment) => {
        if (a.isAccepted && !b.isAccepted) return -1;
        if (!a.isAccepted && b.isAccepted) return 1;
        if (commentSortBy === 'newest')
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        const hotA = (a.likes || 0) + (a.replies?.length || 0);
        const hotB = (b.likes || 0) + (b.replies?.length || 0);
        return hotB - hotA;
      });
      setComments(sorted);
    } catch (e) {
      console.error('获取评论失败:', e);
    }
  }, [postId, commentSortBy]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchPost(), fetchComments()]);
      setLoading(false);
    };
    load();
  }, [fetchPost, fetchComments]);

  // 点赞
  const handleLike = async () => {
    if (!session) { router.push('/auth/signin'); return; }
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setPost((prev) => prev ? { ...prev, likes: data.likes } : null);
      }
    } catch (e) { console.error('点赞失败:', e); }
  };

  // 提交回复
  const handleSubmitReply = async (parentId: string, content: string, images: string[]) => {
    if (!session) { router.push('/auth/signin'); return; }
    if (!content.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), parentCommentId: parentId, images }),
      });
      if (res.ok) { setReplyingTo(null); await fetchComments(); }
      else toast.error('回复失败，请重试');
    } catch (e) {
      console.error('回复失败:', e);
      toast.error('回复失败，请重试');
    } finally {
      setSubmittingReply(false);
    }
  };

  // 最佳答案
  const handleToggleBestAnswer = async (commentId: string, isAccepted: boolean) => {
    if (!session || !isQuestionAuthor) return;
    setProcessingAnswer(commentId);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, action: isAccepted ? 'unaccept' : 'accept' }),
      });
      if (res.ok) {
        await Promise.all([fetchPost(), fetchComments()]);
        toast.success((await res.json()).message);
      } else toast.error((await res.json()).error || '操作失败');
    } catch (e) {
      console.error('标记最佳答案失败:', e);
      toast.error('操作失败，请重试');
    } finally {
      setProcessingAnswer(null);
    }
  };

  // 展开/收起回复
  const toggleReplies = (id: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getAllReplies = (comment: Comment): Comment[] => {
    const all: Comment[] = [];
    comment.replies?.forEach((r) => { all.push(r); all.push(...getAllReplies(r)); });
    return all;
  };

  // ── 渲染主评论 ────────────────────────────────────────────────────────────

  const renderMainComment = (comment: Comment) => {
    const allReplies = getAllReplies(comment);
    const isExpanded = expandedReplies.has(comment._id);

    return (
      <div
        key={comment._id}
        className={`relative border-b border-border pb-6 last:border-b-0 rounded-xl p-5 transition-colors duration-200 ${
          comment.isAccepted
            ? 'bg-emerald-50/80 dark:bg-emerald-950/25 border-2 border-emerald-200 dark:border-emerald-800/60 shadow-[0_4px_16px_rgba(16,185,129,0.08)] dark:shadow-[0_4px_16px_rgba(52,211,153,0.06)]'
            : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <Avatar
            className={`w-10 h-10 shrink-0 ${
              comment.isAccepted
                ? 'ring-2 ring-offset-2 ring-emerald-300 dark:ring-emerald-700 ring-offset-background'
                : ''
            }`}
          >
            <AvatarImage src={comment.author.avatar || undefined} alt={comment.author.name} />
            <AvatarFallback>{comment.author.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* 作者 + 时间 + 最佳答案徽章 */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{comment.author.name}</span>
              <time className="text-xs text-muted-foreground">
                {displayLocalTime(comment.createdAt, 'datetime')}
              </time>
              {comment.isAccepted && (
                <Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  最佳答案
                </Badge>
              )}
            </div>

            {/* 内容 */}
            <div className="mb-3">
              <MarkdownPreview content={comment.content} />
            </div>

            {/* 图片附件 */}
            {comment.images && comment.images.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {comment.images.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt={`评论图片 ${i + 1}`}
                    className="w-16 h-16 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200"
                    onClick={() => { setPreviewImage(url); setPreviewAlt(`评论图片 ${i + 1}`); }}
                  />
                ))}
              </div>
            )}

            {/* 操作栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* 点赞 */}
                <button
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-rose-500 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
                  aria-label={`点赞 ${comment.likes} 个`}
                >
                  <Heart className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{comment.likes}</span>
                </button>

                {/* 回复 */}
                <button
                  onClick={() => { setReplyingTo(comment._id); setReplyToAuthor(comment.author.name); }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
                >
                  回复
                </button>
              </div>

              {/* 标记最佳答案（仅问题作者可见） */}
              {isQuestionAuthor && (
                <button
                  onClick={() => handleToggleBestAnswer(comment._id, comment.isAccepted || false)}
                  disabled={!!processingAnswer}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                    comment.isAccepted
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {processingAnswer === comment._id
                    ? '处理中…'
                    : comment.isAccepted
                    ? '取消最佳答案'
                    : '标记为最佳答案'}
                </button>
              )}
            </div>

            {/* 展开回复按钮 */}
            {allReplies.length > 0 && (
              <button
                onClick={() => toggleReplies(comment._id)}
                className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  strokeWidth={1.5}
                />
                <span>{allReplies.length} 条回复</span>
              </button>
            )}

            {/* 回复输入框 */}
            {replyingTo === comment._id && (
              <div className="mt-3">
                <ReplyInput
                  onSubmit={(c, imgs) => handleSubmitReply(comment._id, c, imgs)}
                  onCancel={() => { setReplyingTo(null); setReplyToAuthor(''); }}
                  isSubmitting={submittingReply}
                  postId={postId}
                  initialContent={replyToAuthor ? `> @${replyToAuthor}：\n\n` : ''}
                />
              </div>
            )}

            {/* 回复列表 */}
            {isExpanded && allReplies.length > 0 && (
              <div className="mt-4 space-y-3 ml-4 pl-4 border-l-2 border-primary/20 relative">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
                {allReplies.map((reply) => {
                  const findParent = (): string | null => {
                    if (reply.parentComment === comment._id) return comment.author.name;
                    return allReplies.find((r) => r._id === reply.parentComment)?.author.name ?? null;
                  };
                  const parentAuthor = findParent();

                  return (
                    <div
                      key={reply._id}
                      className="relative flex items-start gap-3 bg-accent/30 rounded-xl p-3 hover:bg-accent/50 transition-colors duration-150"
                    >
                      <div className="absolute left-[-18px] top-6 w-4 h-px bg-primary/30" />
                      <Avatar className="w-8 h-8 shrink-0 ring-1 ring-border">
                        <AvatarImage src={reply.author.avatar || undefined} alt={reply.author.name} />
                        <AvatarFallback className="text-xs">
                          {reply.author.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">{reply.author.name}</span>
                          <time className="text-xs text-muted-foreground">
                            {displayLocalTime(reply.createdAt, 'datetime')}
                          </time>
                        </div>
                        <div className="text-sm text-foreground">
                          {parentAuthor && parentAuthor !== comment.author.name && (
                            <span className="text-primary font-medium">@{parentAuthor}：</span>
                          )}
                          <MarkdownPreview content={reply.content} />
                        </div>

                        {/* 回复图片 */}
                        {reply.images && reply.images.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {reply.images.map((url, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={i}
                                src={url}
                                alt={`回复图片 ${i + 1}`}
                                className="w-14 h-14 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200"
                                onClick={() => { setPreviewImage(url); setPreviewAlt(`回复图片 ${i + 1}`); }}
                              />
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3 mt-2">
                          <button
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
                            aria-label={`点赞 ${reply.likes || 0} 个`}
                          >
                            <Heart className="w-3 h-3" strokeWidth={1.5} />
                            <span>{reply.likes || 0}</span>
                          </button>
                          <button
                            onClick={() => { setReplyingTo(reply._id); setReplyToAuthor(reply.author.name); }}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
                          >
                            回复
                          </button>
                        </div>

                        {replyingTo === reply._id && (
                          <div className="mt-3">
                            <ReplyInput
                              onSubmit={(c, imgs) => handleSubmitReply(reply._id, c, imgs)}
                              onCancel={() => { setReplyingTo(null); setReplyToAuthor(''); }}
                              isSubmitting={submittingReply}
                              postId={postId}
                              initialContent={`> @${reply.author.name}：\n\n`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
          {/* 面包屑 */}
          <div className="h-4 bg-muted rounded w-48 mb-8" />
          <div className="flex gap-8">
            <div className="flex-1 space-y-4">
              <div className="h-10 bg-muted rounded-xl w-3/4" />
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-64 bg-muted rounded-xl mt-6" />
            </div>
            <div className="hidden lg:block w-64 space-y-3">
              <div className="h-4 bg-muted rounded w-24" />
              {[...Array(6)].map((_, i) => <div key={i} className="h-3 bg-muted rounded" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">文章不存在</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* 阅读进度条 */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-primary/10">
        <div
          className="h-full bg-primary transition-all duration-150 ease-out"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* 侧边浮动工具栏 */}
      <div className="fixed right-6 bottom-8 z-40 flex flex-col gap-2.5">
        {/* 点赞 */}
        {session && (
          <button
            onClick={handleLike}
            aria-label={liked ? '取消点赞' : '点赞'}
            aria-pressed={liked}
            title={liked ? '取消点赞' : '点赞'}
            className={`group relative w-11 h-11 rounded-full border-2 shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              liked
                ? 'bg-rose-500 border-rose-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.30)]'
                : 'bg-card border-border hover:border-primary text-muted-foreground hover:text-rose-500'
            }`}
          >
            <Heart className={`w-4 h-4 mx-auto ${liked ? 'fill-current' : ''}`} strokeWidth={1.5} />
            <span className="sr-only">{liked ? '取消点赞' : '点赞'}</span>
            <span className="pointer-events-none absolute right-full mr-2.5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-popover text-popover-foreground text-xs px-2.5 py-1.5 shadow-md border border-border opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {liked ? '取消点赞' : '点赞'}
            </span>
          </button>
        )}

        {/* 跳转评论 */}
        <button
          onClick={scrollToComments}
          aria-label="跳转到评论区"
          title="评论区"
          className="group relative w-11 h-11 rounded-full bg-card border-2 border-border hover:border-primary text-muted-foreground hover:text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <MessageSquare className="w-4 h-4 mx-auto" strokeWidth={1.5} />
          {comments.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full flex items-center justify-center leading-none">
              {comments.length > 9 ? '9+' : comments.length}
            </span>
          )}
          <span className="pointer-events-none absolute right-full mr-2.5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-popover text-popover-foreground text-xs px-2.5 py-1.5 shadow-md border border-border opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            评论区
          </span>
        </button>

        {/* 返回顶部 */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            aria-label="返回顶部"
            title="返回顶部"
            className="group relative w-11 h-11 rounded-full bg-card border-2 border-border hover:border-primary text-muted-foreground hover:text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 animate-in fade-in slide-in-from-bottom-2"
          >
            <ArrowUp className="w-4 h-4 mx-auto" strokeWidth={1.5} />
            <span className="pointer-events-none absolute right-full mr-2.5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-popover text-popover-foreground text-xs px-2.5 py-1.5 shadow-md border border-border opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              返回顶部
            </span>
          </button>
        )}
      </div>

      {/* 主体 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 面包屑 */}
        <nav aria-label="面包屑" className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded">
            首页
          </Link>
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
          <Link
            href="/posts"
            className="hover:text-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
          >
            知识库
          </Link>
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-foreground truncate max-w-[240px]" aria-current="page">
            {post.title}
          </span>
        </nav>

        <div className="flex gap-8">
          {/* ── 主内容 ── */}
          <div className="flex-1 min-w-0">
            <header className="mb-8">
              {/* 标题 + 状态 */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground leading-tight flex-1">
                  {post.title}
                </h1>
                {post.type === 'question' && post.status && (
                  <div className="mt-1 flex-shrink-0">
                    <StatusBadge status={post.status} />
                  </div>
                )}
              </div>

              {/* 作者 + 统计 */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={post.author.avatar || undefined} alt={post.author.name} />
                    <AvatarFallback>{post.author.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{post.author.name}</p>
                    <p className="text-xs text-muted-foreground">
                      发布于 {displayLocalTime(post.createdAt, 'datetime')}
                      {post.updatedAt !== post.createdAt && (
                        <span className="ml-2">· 更新于 {displayLocalTime(post.updatedAt, 'datetime')}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" strokeWidth={1.5} />
                    {post.views}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-4 h-4" strokeWidth={1.5} />
                    {post.likes}
                  </span>
                  {post.type === 'question' && (
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                      {post.answers}
                    </span>
                  )}
                </div>
              </div>

              {/* 标签 */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/20 hover:bg-primary/15 transition-colors duration-150 cursor-default"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* ── 正文 ── */}
            <article className="prose prose-lg max-w-none mb-12">
              <MarkdownPreview content={stableContent} />
            </article>

            {/* ── 操作栏 ── */}
            <div className="flex items-center gap-3 mb-12 pb-8 border-b border-border">
              <button
                onClick={handleLike}
                aria-pressed={liked}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  liked
                    ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-950/50'
                    : 'bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground hover:-translate-y-0.5'
                }`}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} strokeWidth={1.5} />
                {liked ? '已点赞' : '点赞'}
              </button>

              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-muted-foreground text-sm font-medium hover:bg-accent hover:text-foreground hover:-translate-y-0.5 transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <Share2 className="w-4 h-4" strokeWidth={1.5} />
                分享
              </button>
            </div>

            {/* ── 评论区 ── */}
            <section id="comments-section" aria-label="评论区">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl font-bold text-foreground">
                  {post.type === 'question' ? `${comments.length} 个回答` : `${comments.length} 条评论`}
                </h2>

                {/* 排序切换 */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1" role="group" aria-label="排序方式">
                  {(['newest', 'hottest'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setCommentSortBy(s)}
                      aria-pressed={commentSortBy === s}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                        commentSortBy === s
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {s === 'newest' ? '最新' : '最热'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 评论列表 */}
              <div className="space-y-6 mb-8">
                {comments.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground text-sm">
                    暂无{post.type === 'question' ? '回答' : '评论'}，来抢沙发吧~
                  </p>
                ) : (
                  comments.map((c) => renderMainComment(c))
                )}
              </div>

              {/* 添加评论 */}
              <div className="mt-8">
                <h3 className="font-heading text-base font-semibold text-foreground mb-4">
                  {post.type === 'question' ? '发表你的回答' : '添加评论'}
                </h3>

                {!showCommentInput ? (
                  <button
                    onClick={() => setShowCommentInput(true)}
                    className="w-full px-4 py-3 text-left text-sm text-muted-foreground bg-muted/60 border border-border rounded-xl hover:bg-accent hover:border-border/80 transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {post.type === 'question' ? '写下你的回答…' : '写下你的想法…'}
                  </button>
                ) : (
                  <CommentInput
                    onSubmit={async (content, images) => {
                      if (!session) { router.push('/auth/signin'); return; }
                      setSubmittingComment(true);
                      try {
                        const res = await fetch(`/api/posts/${postId}/comments`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ content, images }),
                        });
                        if (res.ok) { setShowCommentInput(false); await fetchComments(); }
                        else toast.error('发布失败，请重试');
                      } catch (e) {
                        console.error('发布评论失败:', e);
                        toast.error('发布失败，请重试');
                      } finally {
                        setSubmittingComment(false);
                      }
                    }}
                    onCancel={() => setShowCommentInput(false)}
                    placeholder={post.type === 'question' ? '请详细回答这个问题…' : '写下你的想法…'}
                    isSubmitting={submittingComment}
                    postId={postId}
                  />
                )}
              </div>
            </section>
          </div>

          {/* ── 右侧目录 ── */}
          {hasTableOfContents && (
            <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0" aria-label="文章目录">
              <div
                className={`top-24 max-h-[calc(100vh-6rem)] transition-all duration-300 ${
                  isTocFixed ? 'sticky' : 'relative'
                }`}
              >
                <div className="px-4">
                  <TableOfContents content={stableContent} readProgress={readProgress} />
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* 图片预览弹窗 */}
      <ImagePreviewModal
        src={previewImage || ''}
        alt={previewAlt}
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
