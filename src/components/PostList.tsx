'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { displayLocalTime } from '@/lib/frontend-time-utils';
import { Eye, Heart, MessageSquare, AlertTriangle, FileText } from 'lucide-react';
import { PaginationBar } from '@/components/PaginationBar';

interface Post {
  _id: string;
  title: string;
  summary: string;
  content: string;
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
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'open' | 'answered' | 'closed';
  bounty: number;
  createdAt: string;
  updatedAt: string;
}

interface PostListProps {
  refreshTrigger?: number;
  activeTab?: string;
  sortBy?: string;
  searchFilters?: {
    search: string;
    tag: string;
    author: string;
  };
}

export default function PostList({
  refreshTrigger,
  activeTab = 'all',
  sortBy = 'newest',
  searchFilters = { search: '', tag: '', author: '' },
}: PostListProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPosts = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      let url = `/api/posts?page=${pageNum}&limit=10&sort=${sortBy}`;
      if (activeTab === 'questions') url += '&type=question';
      else if (activeTab === 'articles') url += '&type=article';
      else if (activeTab === 'unanswered') url += '&type=question&unanswered=true';
      else if (activeTab === 'unresolved') url += '&type=question&status=open';
      else if (activeTab === 'trending') url += '&trending=true';
      if (searchFilters.search) url += `&search=${encodeURIComponent(searchFilters.search)}`;
      if (searchFilters.tag) url += `&tag=${encodeURIComponent(searchFilters.tag)}`;
      if (searchFilters.author) url += `&author=${encodeURIComponent(searchFilters.author)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('获取内容列表失败');
      const data = await res.json();
      setPosts(data.posts);
      setTotalPages(data.pagination.pages);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取内容列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(1);
  }, [refreshTrigger, activeTab, sortBy, searchFilters]);

  const formatDate = (dateString: string) => {
    const diffInSeconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diffInSeconds < 60) return '刚刚';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} 分钟前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} 小时前`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} 天前`;
    return displayLocalTime(dateString, 'datetime');
  };

  const stripMarkdown = (text: string) =>
    text
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/>\s+/g, '')
      .replace(/[-*+]\s+/g, '')
      .replace(/\d+\.\s+/g, '')
      .replace(/\n+/g, ' ')
      .trim();

  const truncateText = (text: string, maxLength: number) => {
    const clean = stripMarkdown(text);
    return clean.length <= maxLength ? clean : clean.substring(0, maxLength) + '...';
  };

  // MASTER §2.4 语义色：Success/Warning，无硬编码
  const typeBadgeCls = (type: string) =>
    type === 'question'
      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
      : 'bg-primary/15 text-primary border-primary/30';

  const statusBadgeCls = (post: Post) => {
    if (post.acceptedAnswer) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    if (post.status === 'answered') return 'bg-secondary/15 text-secondary border-secondary/30';
    return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
  };

  const statusLabel = (post: Post) =>
    post.acceptedAnswer ? '已解决' : post.status === 'answered' ? '有回答' : '待回答';

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-6 animate-pulse shadow-sm">
            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-20">
                <div className="h-8 bg-muted rounded-lg" />
                <div className="h-4 bg-muted rounded" />
              </div>
              <div className="flex-1">
                <div className="h-6 bg-muted rounded mb-3 w-3/4" />
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16" />
                  <div className="h-6 bg-muted rounded w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-destructive font-medium mb-4">{error}</p>
          <button
            onClick={() => fetchPosts(page)}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-muted/60 rounded-xl p-8 max-w-md mx-auto border border-border">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2">暂无内容</h3>
          <p className="text-muted-foreground text-sm">成为第一个发布内容的人吧！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article
          key={post._id}
          className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-200 ease-out group"
        >
          <div className="p-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${typeBadgeCls(
                    post.type
                  )}`}
                >
                  {post.type === 'question' ? '问题' : '文章'}
                </span>
                {post.type === 'question' && (
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${statusBadgeCls(
                      post
                    )}`}
                  >
                    {statusLabel(post)}
                  </span>
                )}
              </div>

              <Link href={`/posts/${post._id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg">
                <h2 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2">
                  {post.title}
                </h2>
              </Link>

              <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                {truncateText(post.summary || post.content, 150)}
              </p>

              <div className="flex flex-wrap gap-2">
                {post.tags.slice(0, 5).map((tag) => (
                  <Link
                    key={tag}
                    href={`/knowledge?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted/80 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                  >
                    #{tag}
                  </Link>
                ))}
                {post.tags.length > 5 && (
                  <span className="text-xs text-muted-foreground self-center">+{post.tags.length - 5}</span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-4 h-4" strokeWidth={1.5} />
                    <span className="font-medium tabular-nums">{post.likes}</span>
                  </span>
                  {post.type === 'question' && (
                    <span
                      className={`flex items-center gap-1.5 ${
                        post.acceptedAnswer ? 'text-emerald-600 dark:text-emerald-400' : ''
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                      <span className="font-medium tabular-nums">{post.answers}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" strokeWidth={1.5} />
                    <span className="font-medium tabular-nums">{post.views}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={post.author.avatar || undefined} alt={post.author.name} />
                      <AvatarFallback className="text-[10px]">{post.author.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{post.author.name}</span>
                  </div>
                  <time>{formatDate(post.createdAt)}</time>
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}

      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <PaginationBar
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(nextPage) => fetchPosts(nextPage)}
            pageSize={10}
            ariaLabel="内容列表分页"
          />
        </div>
      )}
    </div>
  );
}
