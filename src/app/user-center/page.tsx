'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CreatePost from '@/components/CreatePost';
import CreateQuestion from '@/components/CreateQuestion';

interface UserStats {
  totalPosts: number;
  totalArticles: number;
  totalQuestions: number;
  totalViews: number;
  totalLikes: number;
  drafts: number;
  pendingReview: number;
}

interface Post {
  _id: string;
  title: string;
  type: 'article' | 'question';
  status: string;
  reviewStatus: 'draft' | 'pending' | 'published' | 'rejected';
  views: number;
  likes: number;
  answers?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  type: 'info' | 'success' | 'rejection' | 'warning';
  title: string;
  content: string;
  relatedId?: string;
  relatedType?: string;
  isRead: boolean;
  createdAt: string;
  priority: 'low' | 'normal' | 'high';
}

export default function UserCenterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeSection, setActiveSection] = useState('profile');
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<UserStats>({
    totalPosts: 0,
    totalArticles: 0,
    totalQuestions: 0,
    totalViews: 0,
    totalLikes: 0,
    drafts: 0,
    pendingReview: 0
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editingPostType, setEditingPostType] = useState<'article' | 'question'>('article');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/user-center');
      return;
    }
    
    if (session?.user) {
      fetchUserData();
      fetchMessages();
    }
  }, [session, status, router, currentPage]);

  // 处理URL参数中的编辑请求
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && session?.user) {
      setEditingPost(editId);
      setShowCreatePost(true);
      setActiveSection('content'); // 切换到内容管理标签
      // 清除URL参数
      router.replace('/user-center', { scroll: false });
    }
  }, [searchParams, session, router]);

  // 点击外部区域关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen) {
        setDropdownOpen(null);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [dropdownOpen]);

  const fetchUserData = async () => {
    try {
      const [statsRes, postsRes] = await Promise.all([
        fetch('/api/users/stats'),
        fetch(`/api/users/posts?page=${currentPage}&limit=5`)
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
        setTotalPages(postsData.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('获取用户数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setMessagesLoading(true);
      const response = await fetch('/api/users/messages?page=1&limit=10');
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('获取消息失败:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const getStatusBadge = (reviewStatus: string) => {
    const config = {
      'draft': { label: '草稿', color: 'bg-gray-100 text-gray-800' },
      'pending': { label: '待审核', color: 'bg-yellow-100 text-yellow-800' },
      'published': { label: '已发布', color: 'bg-green-100 text-green-800' },
      'rejected': { label: '已拒绝', color: 'bg-red-100 text-red-800' }
    };
    const statusConfig = config[reviewStatus as keyof typeof config] || config.draft;
    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    );
  };

  const filteredPosts = posts.filter(post => {
    // 搜索过滤
    const matchesSearch = searchQuery.trim() === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.tags && post.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    
    if (!matchesSearch) return false;
    
    // 状态过滤
    switch (activeTab) {
      case 'published':
        return post.reviewStatus === 'published';
      case 'drafts':
        return post.reviewStatus === 'draft';
      case 'pending':
        return post.reviewStatus === 'pending';
      case 'rejected':
        return post.reviewStatus === 'rejected';
      default:
        return true;
    }
  });

  // 计算分页数据
  const itemsPerPage = 5;
  const totalFilteredPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + itemsPerPage);

  // 当搜索或标签页改变时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const handleEditPost = (postId: string) => {
    // 从posts数组中找到对应的文章，获取其类型
    const post = posts.find(p => p._id === postId);
    if (post) {
      setEditingPostType(post.type);
    }
    setEditingPost(postId);
    setShowCreatePost(true);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* 左侧导航 */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white text-2xl font-bold">
                    {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{session?.user?.name}</h1>
                  <p className="text-sm text-gray-600">{session?.user?.email}</p>
                </div>
              </div>
              
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveSection('profile')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-left rounded-lg transition-colors ${
                    activeSection === 'profile'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>个人资料</span>
                </button>
                
                <button
                  onClick={() => setActiveSection('content')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-left rounded-lg transition-colors ${
                    activeSection === 'content'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>内容管理</span>
                  {stats.pendingReview > 0 && (
                    <span className="ml-auto bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {stats.pendingReview}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => setActiveSection('messages')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-left rounded-lg transition-colors ${
                    activeSection === 'messages'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>消息</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1">
            {/* 个人资料 */}
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">个人资料</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                      <input
                        type="text"
                        value={session?.user?.name || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                      <input
                        type="email"
                        value={session?.user?.email || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">加入时间</label>
                      <input
                        type="text"
                        value={new Date().toLocaleDateString('zh-CN')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">用户类型</label>
                      <input
                        type="text"
                        value="普通用户"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">个人简介</label>
                    <textarea
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="介绍一下你自己..."
                    />
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      保存更改
                    </button>
                  </div>
                </div>
                
                {/* 统计数据 */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">我的统计</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border border-gray-200 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{stats.totalPosts}</div>
                      <div className="text-sm text-gray-600">总发布</div>
                    </div>
                    <div className="text-center p-4 border border-gray-200 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{stats.totalArticles}</div>
                      <div className="text-sm text-gray-600">文章</div>
                    </div>
                    <div className="text-center p-4 border border-gray-200 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{stats.totalQuestions}</div>
                      <div className="text-sm text-gray-600">问题</div>
                    </div>
                    <div className="text-center p-4 border border-gray-200 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{stats.totalViews}</div>
                      <div className="text-sm text-gray-600">浏览量</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 内容管理 */}
            {activeSection === 'content' && (
              <div className="space-y-6">
                {/* 统计卡片 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalPosts}</div>
                    <div className="text-sm text-gray-600">总发布</div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.totalArticles}</div>
                    <div className="text-sm text-gray-600">文章</div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.totalQuestions}</div>
                    <div className="text-sm text-gray-600">问题</div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</div>
                    <div className="text-sm text-gray-600">待审核</div>
                  </div>
                </div>

                {/* 内容管理 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  {/* 头部 */}
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900">内容管理</h2>
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="搜索内容..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 标签页 */}
                  <div className="border-b border-gray-100">
                    <nav className="flex space-x-8 px-6" aria-label="Tabs">
                      {[
                        { id: 'overview', label: '全部内容', count: posts.length, icon: '📄' },
                        { id: 'published', label: '已发布', count: posts.filter(p => p.reviewStatus === 'published').length, icon: '✅' },
                        { id: 'pending', label: '待审核', count: posts.filter(p => p.reviewStatus === 'pending').length, icon: '⏳' },
                        { id: 'drafts', label: '草稿', count: posts.filter(p => p.reviewStatus === 'draft').length, icon: '📝' },
                        { id: 'rejected', label: '已拒绝', count: posts.filter(p => p.reviewStatus === 'rejected').length, icon: '❌' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                            activeTab === tab.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <span>{tab.icon}</span>
                          <span>{tab.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            activeTab === tab.id
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* 内容列表 */}
                  <div className="p-6">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2">加载中...</p>
                      </div>
                    ) : filteredPosts.length === 0 ? (
                      <div className="text-center py-12">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d={searchQuery.trim() ? "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" : "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"} />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {searchQuery.trim() ? '未找到匹配的内容' : '暂无内容'}
                        </h3>
                        <p className="text-gray-500 mb-4">
                          {searchQuery.trim() 
                            ? `没有找到包含"${searchQuery}"的内容，请尝试其他关键词` 
                            : (activeTab === 'drafts' ? '你还没有保存任何草稿' : 
                               activeTab === 'pending' ? '你还没有待审核的内容' :
                               activeTab === 'published' ? '你还没有已发布的内容' :
                               activeTab === 'rejected' ? '你还没有被拒绝的内容' : 
                               '你还没有发布任何内容')
                          }
                        </p>
                        {!searchQuery.trim() && (
                          <Link
                            href="/"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            开始创作
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {paginatedPosts.map((post) => (
                          <div key={post._id} className="group border border-gray-100 rounded-lg p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200 bg-gradient-to-r from-white to-gray-50/50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-3">
                                  <span className={`inline-flex items-center px-2.5 py-1 text-xs rounded-full font-medium ${
                                    post.type === 'question' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                                  }`}>
                                    {post.type === 'question' ? '🤔 问题' : '📝 文章'}
                                  </span>
                                  {getStatusBadge(post.reviewStatus)}
                                  <span className="text-xs text-gray-400">
                                    {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                                  </span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 cursor-pointer group-hover:text-blue-600 transition-colors">
                                  {post.title}
                                </h3>
                                <div className="flex items-center space-x-6 text-sm text-gray-500">
                                  {post.reviewStatus === 'published' && (
                                    <>
                                      <div className="flex items-center space-x-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        <span>{post.views}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                        <span>{post.likes}</span>
                                      </div>
                                      {post.type === 'question' && (
                                        <div className="flex items-center space-x-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                          </svg>
                                          <span>{post.answers}</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center ml-4 space-x-2">
                                <Link
                                  href={`/posts/${post._id}`}
                                  target="_blank"
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="查看"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </Link>
                                <button 
                                  onClick={() => handleEditPost(post._id)}
                                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="编辑"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirm('确定要删除这个内容吗？')) {
                                      // TODO: 实现删除功能
                                    }
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="删除"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 分页 */}
                    {totalFilteredPages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                        <div className="text-sm text-gray-500">
                          显示第 {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredPosts.length)} 项，共 {filteredPosts.length} 项
                          {searchQuery.trim() && (
                            <span className="ml-2 text-blue-600">（搜索: "{searchQuery}"）</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            上一页
                          </button>
                          <div className="flex space-x-1">
                            {[...Array(totalFilteredPages)].map((_, i) => {
                              const page = i + 1;
                              return (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                                    currentPage === page
                                      ? 'bg-blue-600 text-white'
                                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalFilteredPages))}
                            disabled={currentPage === totalFilteredPages}
                            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            下一页
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 消息 */}
            {activeSection === 'messages' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">消息中心</h2>
                    {unreadCount > 0 && (
                      <button className="text-sm text-blue-600 hover:text-blue-800">
                        标记全部已读
                      </button>
                    )}
                  </div>
                  
                  {messagesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">加载中...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">暂无消息</h3>
                      <p className="text-gray-500">您还没有收到任何消息</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className={`border rounded-lg p-4 transition-all duration-200 ${
                          message.isRead ? 'border-gray-200 bg-gray-50/50' : 'border-blue-200 bg-blue-50/50'
                        }`}>
                          <div className="flex items-start space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              message.type === 'rejection' ? 'bg-red-500' :
                              message.type === 'success' ? 'bg-green-500' :
                              message.type === 'warning' ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }`}>
                              {message.type === 'rejection' ? (
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              ) : message.type === 'success' ? (
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : message.type === 'warning' ? (
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium text-gray-900">{message.title}</h3>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-500">
                                    {new Date(message.createdAt).toLocaleDateString('zh-CN')}
                                  </span>
                                  {!message.isRead && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {message.content}
                              </p>
                              {message.relatedId && (
                                <div className="mt-2">
                                  <Link
                                    href={`/posts/${message.relatedId}`}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                  >
                                    查看相关内容 →
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 编辑文章模态框 */}
      {showCreatePost && editingPost && (
        <>
          {editingPostType === 'article' ? (
            <CreatePost
              editPostId={editingPost}
              onClose={() => {
                setShowCreatePost(false);
                setEditingPost(null);
              }}
              onPostCreated={() => {
                setShowCreatePost(false);
                setEditingPost(null);
                fetchUserData(); // 重新获取数据
              }}
            />
          ) : (
            <CreateQuestion
              editQuestionId={editingPost}
              onClose={() => {
                setShowCreatePost(false);
                setEditingPost(null);
              }}
              onQuestionCreated={() => {
                setShowCreatePost(false);
                setEditingPost(null);
                fetchUserData(); // 重新获取数据
              }}
            />
          )}
        </>
      )}
    </div>
  );
} 