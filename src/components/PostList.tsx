'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
        url += '&type=question&status=open&answers=0';
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
    
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string, hasAcceptedAnswer: boolean) => {
    if (hasAcceptedAnswer) return 'bg-green-100 text-green-800 border-green-200';
    switch (status) {
      case 'answered': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="flex space-x-4">
              <div className="flex flex-col space-y-2 w-20">
                <div className="h-8 bg-gray-200 rounded text-center"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded mb-3"></div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-red-700 font-medium">{error}</p>
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
        <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无内容</h3>
          <p className="text-gray-600">成为第一个发布内容的人吧！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article key={post._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <div className="p-6">
            <div className="flex space-x-6">
              {/* 左侧统计信息 */}
              <div className="flex flex-col items-center space-y-2 text-sm text-gray-500 min-w-[80px]">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{post.likes}</div>
                  <div>点赞</div>
                </div>
                
                {post.type === 'question' && (
                  <div className="text-center">
                    <div className={`text-lg font-semibold ${post.acceptedAnswer ? 'text-green-600' : 'text-gray-900'}`}>
                      {post.answers}
                    </div>
                    <div>回答</div>
                  </div>
                )}
                
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{post.views}</div>
                  <div>浏览</div>
                </div>
              </div>

              {/* 主要内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {/* 内容类型标识 */}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      post.type === 'question' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {post.type === 'question' ? '问题' : '文章'}
                    </span>

                    {/* 问题状态 */}
                    {post.type === 'question' && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                        getStatusColor(post.status, !!post.acceptedAnswer)
                      }`}>
                        {post.acceptedAnswer ? '已解决' : post.status === 'answered' ? '有回答' : '待回答'}
                      </span>
                    )}




                  </div>
                </div>

                <Link href={`/posts/${post._id}`}>
                  <h2 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-200 cursor-pointer mb-2 line-clamp-2">
                    {post.title}
                  </h2>
                </Link>

                <p className="text-gray-600 mb-4 line-clamp-2 text-sm leading-relaxed">
                  {truncateText(post.summary || post.content, 150)}
                </p>

                {/* 标签和作者信息 */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map((tag, index) => (
                      <Link
                        key={index}
                        href={`/?tag=${tag}`}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-800 transition-colors duration-200"
                      >
                        {tag}
                      </Link>
                    ))}
                    {post.tags.length > 3 && (
                      <span className="text-xs text-gray-500">+{post.tags.length - 3}</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {post.author.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">{post.author.name}</span>
                    </div>
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
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
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200 text-sm"
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
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
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
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200 text-sm"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
} 