'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Post {
  _id: string;
  title: string;
  content: string;
  type: 'article' | 'question';
  status: 'open' | 'answered' | 'closed';
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
    openQuestions: number;
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
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(typeFilter && { type: typeFilter }),
        ...(statusFilter && { status: statusFilter }),
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
  }, [currentPage, searchTerm, typeFilter, statusFilter]);

  const handleUpdatePost = async (postId: string, updates: { status?: string; featured?: boolean }) => {
    setUpdating(postId);
    try {
      const response = await fetch('/api/admin/posts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          ...updates,
        }),
      });

      if (response.ok) {
        await fetchPosts();
      } else {
        alert('更新失败');
      }
    } catch (error) {
      console.error('更新内容失败:', error);
      alert('更新失败');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('确定要删除这个内容吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/posts?postId=${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchPosts();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('删除内容失败:', error);
      alert('删除失败');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const getTypeText = (type: string) => {
    return type === 'article' ? '文章' : '问题';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return '待解决';
      case 'answered': return '已回答';
      case 'closed': return '已关闭';
      default: return status;
    }
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">加载数据失败</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和统计 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">内容管理</h1>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">总内容数</p>
            <p className="text-2xl font-bold text-gray-900">{data.stats.totalPosts}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">文章</p>
            <p className="text-2xl font-bold text-green-600">{data.stats.articles}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">问题</p>
            <p className="text-2xl font-bold text-blue-600">{data.stats.questions}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">待解决</p>
            <p className="text-2xl font-bold text-orange-600">{data.stats.openQuestions}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">总浏览量</p>
            <p className="text-2xl font-bold text-purple-600">{data.stats.totalViews}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">总点赞数</p>
            <p className="text-2xl font-bold text-red-600">{data.stats.totalLikes}</p>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">搜索内容</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索标题或内容..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">类型筛选</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部类型</option>
              <option value="article">文章</option>
              <option value="question">问题</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">状态筛选</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部状态</option>
              <option value="open">待解决</option>
              <option value="answered">已回答</option>
              <option value="closed">已关闭</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('');
                setStatusFilter('');
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              重置筛选
            </button>
          </div>
        </div>
      </div>

      {/* 内容列表 */}
      <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  内容
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  作者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  统计
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.posts.map((post) => (
                <tr key={post._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        <Link href={`/posts/${post._id}`} className="hover:text-blue-600">
                          {post.title}
                        </Link>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {truncateContent(post.content.replace(/[#*`]/g, ''), 80)}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                        {post.tags.length > 3 && (
                          <span className="text-xs text-gray-500">+{post.tags.length - 3}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        src={post.author.avatar || '/default-avatar.png'}
                        alt={post.author.name}
                        className="h-8 w-8 rounded-full"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{post.author.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      post.type === 'article' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {getTypeText(post.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {post.type === 'question' ? (
                      <select
                        value={post.status}
                        onChange={(e) => handleUpdatePost(post._id, { status: e.target.value })}
                        disabled={updating === post._id}
                        className={`text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          post.status === 'open' ? 'text-orange-600' :
                          post.status === 'answered' ? 'text-green-600' : 'text-gray-600'
                        }`}
                      >
                        <option value="open">待解决</option>
                        <option value="answered">已回答</option>
                        <option value="closed">已关闭</option>
                      </select>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1">
                      <div>👁️ {post.views}</div>
                      <div>❤️ {post.likes}</div>
                      {post.type === 'question' && <div>💬 {post.answers}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(post.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      href={`/posts/${post._id}`}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      查看
                    </Link>
                    <button
                      onClick={() => handleDeletePost(post._id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between bg-white px-6 py-3 border rounded-lg">
        <div className="text-sm text-gray-700">
          显示 {((currentPage - 1) * 10) + 1} 到 {Math.min(currentPage * 10, data.pagination.total)} 条，
          共 {data.pagination.total} 条记录
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一页
          </button>
          <span className="px-3 py-1 text-sm">
            第 {currentPage} 页，共 {data.pagination.pages} 页
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(data.pagination.pages, currentPage + 1))}
            disabled={currentPage === data.pagination.pages}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
} 