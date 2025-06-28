'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Post {
  _id: string;
  title: string;
  type: 'article' | 'question';
  views: number;
  likes: number;
  createdAt: string;
  author?: {
    name: string;
  };
}

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
}

interface Tag {
  _id: string;
  count: number;
}

interface DashboardData {
  overview: {
    users: {
      totalUsers: number;
      activeUsers: number;
      adminUsers: number;
      newUsersThisMonth: number;
    };
    posts: {
      totalPosts: number;
      articles: number;
      questions: number;
      openQuestions: number;
      totalViews: number;
      totalLikes: number;
      newPostsThisMonth: number;
    };
  };
  recentActivity: {
    recentPosts: Post[];
    recentUsers: User[];
    popularPosts: Post[];
  };
  charts: {
    dailyUsers: unknown[];
    dailyPosts: unknown[];
    topTags: Tag[];
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/admin/dashboard');
        if (response.ok) {
          const dashboardData = await response.json();
          setData(dashboardData);
        }
      } catch (error) {
        console.error('获取仪表板数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // 更新时间
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('zh-CN').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载仪表板数据...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📊</div>
        <p className="text-gray-500 text-lg">加载数据失败</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 页面标题和时间 */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">仪表板</h1>
          <p className="text-gray-600 mt-2">欢迎来到 PonyMind 管理后台</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">当前时间</p>
          <p className="text-lg font-mono text-gray-900">{formatTime(currentTime)}</p>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link 
          href="/admin/users"
          className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
        >
          <div className="flex items-center">
            <div className="text-3xl mr-4">👥</div>
            <div>
              <h3 className="text-lg font-semibold">用户管理</h3>
              <p className="text-blue-100 text-sm">管理用户账户</p>
            </div>
          </div>
        </Link>
        
        <Link 
          href="/admin/posts"
          className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105"
        >
          <div className="flex items-center">
            <div className="text-3xl mr-4">📝</div>
            <div>
              <h3 className="text-lg font-semibold">内容管理</h3>
              <p className="text-green-100 text-sm">管理文章和问题</p>
            </div>
          </div>
        </Link>
        
        <Link 
          href="/admin/tags"
          className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
        >
          <div className="flex items-center">
            <div className="text-3xl mr-4">🏷️</div>
            <div>
              <h3 className="text-lg font-semibold">标签管理</h3>
              <p className="text-purple-100 text-sm">管理内容标签</p>
            </div>
          </div>
        </Link>
        
        <Link 
          href="/admin/settings"
          className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-lg text-white hover:from-orange-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105"
        >
          <div className="flex items-center">
            <div className="text-3xl mr-4">⚙️</div>
            <div>
              <h3 className="text-lg font-semibold">系统设置</h3>
              <p className="text-orange-100 text-sm">配置系统参数</p>
            </div>
          </div>
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-2xl">👥</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">总用户数</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(data.overview.users.totalUsers)}
              </p>
              <p className="text-sm text-green-600 flex items-center">
                <span className="mr-1">↗</span>
                本月新增 {data.overview.users.newUsersThisMonth}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-2xl">📝</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">总内容数</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(data.overview.posts.totalPosts)}
              </p>
              <p className="text-sm text-green-600 flex items-center">
                <span className="mr-1">↗</span>
                本月新增 {data.overview.posts.newPostsThisMonth}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-2xl">👁️</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">总浏览量</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(data.overview.posts.totalViews)}
              </p>
              <p className="text-sm text-gray-500">累计浏览次数</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 text-2xl">❤️</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">总点赞数</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(data.overview.posts.totalLikes)}
              </p>
              <p className="text-sm text-gray-500">累计点赞次数</p>
            </div>
          </div>
        </div>
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">用户统计</h3>
            <Link href="/admin/users" className="text-blue-600 hover:text-blue-800 text-sm">
              详细管理 →
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-gray-600">活跃用户</span>
              </div>
              <span className="font-medium text-gray-900">{formatNumber(data.overview.users.activeUsers)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                <span className="text-gray-600">管理员</span>
              </div>
              <span className="font-medium text-gray-900">{formatNumber(data.overview.users.adminUsers)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                <span className="text-gray-600">本月新用户</span>
              </div>
              <span className="font-medium text-green-600">
                {formatNumber(data.overview.users.newUsersThisMonth)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">内容统计</h3>
            <Link href="/admin/posts" className="text-blue-600 hover:text-blue-800 text-sm">
              详细管理 →
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-gray-600">文章</span>
              </div>
              <span className="font-medium text-gray-900">{formatNumber(data.overview.posts.articles)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-gray-600">问题</span>
              </div>
              <span className="font-medium text-gray-900">{formatNumber(data.overview.posts.questions)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                <span className="text-gray-600">待解决问题</span>
              </div>
              <span className="font-medium text-orange-600">
                {formatNumber(data.overview.posts.openQuestions)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">最新内容</h3>
            <Link href="/admin/posts" className="text-blue-600 hover:text-blue-800 text-sm">
              查看全部 →
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentActivity.recentPosts.slice(0, 5).map((post) => (
              <div key={post._id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex-shrink-0">
                  <span className={`inline-block w-3 h-3 rounded-full ${
                    post.type === 'article' ? 'bg-green-400' : 'bg-blue-400'
                  }`}></span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {post.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {post.author?.name} • {formatDate(post.createdAt)}
                  </p>
                </div>
                <div className="flex-shrink-0 text-xs text-gray-500 text-right">
                  <div>{post.views} 浏览</div>
                  <div>{post.likes} 点赞</div>
                </div>
              </div>
            ))}
            {data.recentActivity.recentPosts.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                暂无内容
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">新用户</h3>
            <Link href="/admin/users" className="text-blue-600 hover:text-blue-800 text-sm">
              查看全部 →
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentActivity.recentUsers.slice(0, 5).map((user) => (
              <div key={user._id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex-shrink-0">
                  <img
                    src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=fff`}
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-red-100 text-red-800'
                      : user.role === 'moderator'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role === 'admin' ? '管理员' : user.role === 'moderator' ? '版主' : '用户'}
                  </span>
                </div>
              </div>
            ))}
            {data.recentActivity.recentUsers.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                暂无新用户
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 热门标签 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">热门标签</h3>
          <Link href="/admin/tags" className="text-blue-600 hover:text-blue-800 text-sm">
            管理标签 →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.charts.topTags.slice(0, 20).map((tag) => (
            <span
              key={tag._id}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
            >
              {tag._id}
              <span className="ml-2 text-xs bg-blue-200 px-2 py-0.5 rounded-full">
                {tag.count}
              </span>
            </span>
          ))}
          {data.charts.topTags.length === 0 && (
            <div className="text-gray-500 text-sm">
              暂无标签数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 