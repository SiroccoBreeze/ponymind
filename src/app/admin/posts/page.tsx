'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye, Heart, MessageCircle, Trash2, Check, X } from 'lucide-react';
import { displayLocalTime } from '@/lib/frontend-time-utils';

interface Post {
  _id: string;
  title: string;
  content: string;
  type: 'article' | 'question';
  status: 'open' | 'answered' | 'closed';
  reviewStatus: 'draft' | 'pending' | 'published' | 'rejected';
  tags: string[];
  views: number;
  likes: number;
  answers: number;
  createdAt: string;
  updatedAt: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

interface PostData {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: {
    totalPosts: number;
    articles: number;
    questions: number;
    drafts: number;
    pending: number;
    published: number;
    rejected: number;
    totalViews: number;
    totalLikes: number;
  };
}

export default function PostsManagement() {
  const [data, setData] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectPostId, setRejectPostId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pendingDeletePostId, setPendingDeletePostId] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(typeFilter && { type: typeFilter }),
        ...(reviewStatusFilter && { reviewStatus: reviewStatusFilter }),
        admin: 'true',
      });

      const response = await fetch(`/api/admin/posts?${params}`);
      if (response.ok) {
        const postData = await response.json();
        setData(postData);
      }
    } catch (error) {
      console.error('获取内容列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [currentPage, searchTerm, typeFilter, reviewStatusFilter]);

  const handleReviewAction = async (postId: string, action: 'approve' | 'reject', reason?: string) => {
    setUpdating(postId);
    try {
      const response = await fetch('/api/admin/posts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          action,
          reason,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        await fetchPosts();
        setShowRejectModal(false);
        setRejectPostId(null);
        setRejectReason('');
        
        // 显示操作成功和消息发送状态
        if (result.messageSent) {
          const actionText = action === 'approve' ? '通过审核' : '拒绝审核';
          const messageText = result.messageType === 'rejection' 
            ? '已拒绝内容并发送消息通知作者'
            : '已通过审核并发送消息通知作者';
          
          console.log(`${actionText}成功: ${messageText}`);
          // 这里可以添加一个toast通知来显示成功消息
        }
      } else {
        console.error('审核操作失败');
      }
    } catch (error) {
      console.error('审核操作失败:', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = (postId: string) => {
    setRejectPostId(postId);
    setShowRejectModal(true);
    setRejectReason('');
  };

  const confirmReject = () => {
    if (rejectPostId) {
      handleReviewAction(rejectPostId, 'reject', rejectReason.trim() || '未通过审核');
      setShowRejectModal(false);
      setRejectPostId(null);
    }
  };

  const handleDeletePost = (postId: string) => {
    setPendingDeletePostId(postId);
    setIsDeleteDialogOpen(true);
  };
  const confirmDeletePost = async () => {
    if (!pendingDeletePostId) return;
    setIsDeleteDialogOpen(false);
    try {
      const response = await fetch(`/api/admin/posts?postId=${pendingDeletePostId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchPosts();
        console.log('内容删除成功，已发送消息通知作者');
        // 这里可以添加一个toast通知来显示成功消息
      } else {
        console.error('删除失败');
      }
    } catch (error) {
      console.error('删除内容失败:', error);
    } finally {
      setPendingDeletePostId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return displayLocalTime(dateString, 'date');
  };

  const getTypeText = (type: string) => {
    return type === 'article' ? '文章' : '问题';
  };

  const getReviewStatusBadge = (reviewStatus: string) => {
    const config = {
      'draft': { label: '草稿', color: 'bg-gray-100 text-gray-800', icon: '📝' },
      'pending': { label: '待审核', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
      'published': { label: '已发布', color: 'bg-green-100 text-green-800', icon: '✅' },
      'rejected': { label: '已拒绝', color: 'bg-red-100 text-red-800', icon: '❌' }
    };
    const statusConfig = config[reviewStatus as keyof typeof config] || config.draft;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusConfig.color}`}>
        <span>{statusConfig.icon}</span>
        <span>{statusConfig.label}</span>
      </span>
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setReviewStatusFilter('');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 md:py-8">
          <div className="bg-white rounded-lg shadow-sm border p-6 md:p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">无法加载内容数据，请稍后重试</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 md:py-8">
        {/* 页面标题 */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">内容管理</h1>
          <p className="text-gray-600 mt-2">管理所有用户发布的文章和问题</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900 mt-3 md:mt-4">{data.stats.totalPosts}</p>
            <p className="text-xs md:text-sm text-gray-600">总内容</p>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900 mt-3 md:mt-4">{data.stats.published}</p>
            <p className="text-xs md:text-sm text-gray-600">已发布</p>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900 mt-3 md:mt-4">{data.stats.pending}</p>
            <p className="text-xs md:text-sm text-gray-600">待审核</p>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900 mt-3 md:mt-4">{data.stats.rejected}</p>
            <p className="text-xs md:text-sm text-gray-600">已拒绝</p>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900 mt-3 md:mt-4">{data.stats.totalViews}</p>
            <p className="text-xs md:text-sm text-gray-600">总浏览</p>
          </div>
        </div>

        {/* 内容管理 */}
        <div className="bg-white rounded-lg shadow-sm border">
          {/* 搜索和筛选 */}
          <div className="p-4 md:p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="搜索标题或内容..."
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">全部类型</option>
                  <option value="article">文章</option>
                  <option value="question">问题</option>
                </select>

                <select
                  value={reviewStatusFilter}
                  onChange={(e) => setReviewStatusFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">全部状态</option>
                  <option value="draft">草稿</option>
                  <option value="pending">待审核</option>
                  <option value="published">已发布</option>
                  <option value="rejected">已拒绝</option>
                </select>

                {(searchTerm || typeFilter || reviewStatusFilter) && (
                  <button
                    onClick={clearFilters}
                    className="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    清除筛选
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 内容列表 */}
          <div className="overflow-x-auto">
            {data.posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无内容</h3>
                <p className="text-gray-500">当前筛选条件下没有找到相关内容</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/3 table-cell">
                      内容信息
                    </th>
                    <th className="px-2 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-24 md:w-32 table-cell">
                      作者
                    </th>
                    <th className="px-2 md:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-20 md:w-24 table-cell">
                      状态
                    </th>
                    <th className="px-2 md:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-20 md:w-28 table-cell">
                      统计
                    </th>
                    <th className="px-2 md:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-20 md:w-28 table-cell">
                      时间
                    </th>
                    <th className="px-2 md:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-16 md:w-20 table-cell">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.posts.map((post) => (
                    <tr key={post._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 md:px-6 py-4 table-cell">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              post.type === 'question' 
                                ? 'bg-orange-100 text-orange-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {getTypeText(post.type)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/posts/${post._id}`}
                              target="_blank"
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                              title={post.title}
                            >
                              {post.title}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 md:px-6 py-4 table-cell">
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-8 h-8 text-sm" title={`${post.author.name} (${post.author.email})`}>
                            <AvatarImage src={post.author.avatar || undefined} alt={post.author.name} />
                            <AvatarFallback>{post.author.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 hidden lg:block">
                            <div className="text-sm font-medium text-gray-900 truncate" title={post.author.name}>{post.author.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 md:px-6 py-4 table-cell">
                        <div className="flex justify-center">
                          {getReviewStatusBadge(post.reviewStatus)}
                        </div>
                      </td>
                      <td className="px-2 md:px-6 py-4 table-cell">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Eye className="w-4 h-4 text-gray-400" />
                            <span className="text-xs">{post.views}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart className="w-4 h-4 text-gray-400" />
                            <span className="text-xs">{post.likes}</span>
                          </div>
                          {post.type === 'question' && (
                            <div className="flex items-center space-x-1">
                              <MessageCircle className="w-4 h-4 text-gray-400" />
                              <span className="text-xs">{post.answers}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 md:px-6 py-4 table-cell">
                        <div className="text-xs text-gray-500 whitespace-nowrap text-center">
                          <span>创建：{formatDate(post.createdAt)}</span>
                          {post.updatedAt !== post.createdAt && (
                            <span className="ml-2">更新：{formatDate(post.updatedAt)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 md:px-6 py-4 text-center table-cell">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">打开菜单</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/posts/${post._id}`} target="_blank" className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" />
                                查看内容
                              </Link>
                            </DropdownMenuItem>
                            
                            {post.reviewStatus === 'pending' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleReviewAction(post._id, 'approve')}
                                  disabled={updating === post._id}
                                  className="cursor-pointer text-green-600 focus:text-green-600"
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  {updating === post._id ? '处理中...' : '通过审核'}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleReject(post._id)}
                                  disabled={updating === post._id}
                                  className="cursor-pointer text-red-600 focus:text-red-600"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  拒绝审核
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeletePost(post._id)}
                              className="cursor-pointer text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除内容
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 分页 */}
          {data.pagination.pages > 1 && (
            <div className="px-4 md:px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                <div className="text-sm text-gray-700 text-center sm:text-left">
                  显示第 {(data.pagination.page - 1) * data.pagination.limit + 1} - {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} 条，共 {data.pagination.total} 条记录
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    第 {currentPage} 页，共 {data.pagination.pages} 页
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(data.pagination.pages, currentPage + 1))}
                    disabled={currentPage === data.pagination.pages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 拒绝模态框 */}
      <AlertDialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>拒绝原因</AlertDialogTitle>
            <AlertDialogDescription>
              请输入拒绝原因，以便用户了解拒绝的原因。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="请输入拒绝原因（选填）"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRejectModal(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReject}>确认拒绝</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除这个内容吗？</AlertDialogTitle>
            <AlertDialogDescription>此操作不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePost}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 