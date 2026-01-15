'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { displayLocalTime } from '@/lib/frontend-time-utils';

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
    avatar?: string; // Added avatar field
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
  searchFilters = { search: '', tag: '', author: '' }
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
      
      // 根据activeTab添加筛选参数
      if (activeTab === 'questions') {
        url += '&type=question';
      } else if (activeTab === 'articles') {
        url += '&type=article';
      } else if (activeTab === 'unanswered') {
        // 待答问题：包括完全没有回答的问题，以及有回答但未标记最佳答案的问题
        url += '&type=question&unanswered=true';
      } else if (activeTab === 'trending') {
        url += '&trending=true';
      }

      // 添加搜索筛选参数
      if (searchFilters.search) {
        url += `&search=${encodeURIComponent(searchFilters.search)}`;
      }
      if (searchFilters.tag) {
        url += `&tag=${encodeURIComponent(searchFilters.tag)}`;
      }
      if (searchFilters.author) {
        url += `&author=${encodeURIComponent(searchFilters.author)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('获取内容列表失败');
      }
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
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return '刚刚';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} 分钟前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} 小时前`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} 天前`;
    
    return displayLocalTime(dateString, 'datetime');
  };

  const stripMarkdown = (text: string) => {
    return text
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
  };

  const truncateText = (text: string, maxLength: number) => {
    const cleanText = stripMarkdown(text);
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength) + '...';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'advanced': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusColor = (status: string, hasAcceptedAnswer: boolean) => {
    if (hasAcceptedAnswer) return 'bg-green-500/10 text-green-600 border-green-500/20';
    switch (status) {
      case 'answered': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'closed': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg shadow-sm border border-border p-6 animate-pulse">
            <div className="flex space-x-4">
              <div className="flex flex-col space-y-2 w-20">
                <div className="h-8 bg-muted rounded text-center"></div>
                <div className="h-4 bg-muted rounded"></div>
              </div>
              <div className="flex-1">
                <div className="h-6 bg-muted rounded mb-3"></div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-16"></div>
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
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md mx-auto">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => fetchPosts(page)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
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
                  <div className="bg-muted rounded-lg p-8 max-w-md mx-auto">
            <svg className="w-16 h-16 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-foreground mb-2">暂无内容</h3>
            <p className="text-muted-foreground">成为第一个发布内容的人吧！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article key={post._id} className="bg-card rounded-lg shadow-sm border border-border hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300 ease-out group">
          <div className="p-5">
            {/* 主要内容 */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 内容类型标识 - 增强配色 */}
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${
                    post.type === 'question' 
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/20' 
                      : 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30 dark:border-sky-500/20'
                  }`}>
                    {post.type === 'question' ? '问题' : '文章'}
                  </span>

                  {/* 问题状态 - 增强配色 */}
                  {post.type === 'question' && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      post.acceptedAnswer 
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 dark:border-emerald-500/20'
                        : post.status === 'answered'
                        ? 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30 dark:border-violet-500/20'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 dark:border-rose-500/20'
                    }`}>
                      {post.acceptedAnswer ? '已解决' : post.status === 'answered' ? '有回答' : '待回答'}
                    </span>
                  )}
                </div>
              </div>

              <Link href={`/posts/${post._id}`}>
                <h2 className="text-lg font-semibold text-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 cursor-pointer line-clamp-2">
                  {post.title}
                </h2>
              </Link>

              <p className="text-muted-foreground line-clamp-2 text-sm" style={{ lineHeight: '1.6' }}>
                {truncateText(post.summary || post.content, 150)}
              </p>

              {/* 标签 */}
              <div className="flex flex-wrap gap-2">
                {post.tags.slice(0, 5).map((tag, index) => (
                  <Link
                    key={index}
                    href={`/?tag=${tag}`}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted/80 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                  >
                    {tag}
                  </Link>
                ))}
                {post.tags.length > 5 && (
                  <span className="text-xs text-muted-foreground self-center">+{post.tags.length - 5}</span>
                )}
              </div>

              {/* 底部信息栏 - 横向排列 */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {/* 点赞数 */}
                  <div className="flex items-center gap-1.5 group/item hover:text-red-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="font-medium">{post.likes}</span>
                  </div>

                  {/* 回答/评论数 */}
                  {post.type === 'question' && (
                    <div className="flex items-center gap-1.5 group/item hover:text-blue-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className={`font-medium ${post.acceptedAnswer ? 'text-green-600 dark:text-green-500' : ''}`}>
                        {post.answers}
                      </span>
                    </div>
                  )}

                  {/* 浏览数 */}
                  <div className="flex items-center gap-1.5 group/item hover:text-purple-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="font-medium">{post.views}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={post.author.avatar || undefined} alt={post.author.name} />
                      <AvatarFallback className="text-xs">{post.author.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{post.author.name}</span>
                  </div>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <button
            onClick={() => fetchPosts(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors duration-200 text-sm bg-background text-foreground"
          >
            上一页
          </button>
          
          <div className="flex space-x-1">
            {[...Array(Math.min(totalPages, 7))].map((_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => fetchPosts(pageNum)}
                  className={`px-3 py-2 rounded-lg transition-colors duration-200 text-sm ${
                    page === pageNum
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border hover:bg-accent bg-background text-foreground'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => fetchPosts(page + 1)}
            disabled={page >= totalPages}
            className="px-4 py-2 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors duration-200 text-sm bg-background text-foreground"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
} 