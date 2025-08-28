'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CreatePost from '@/components/CreatePost';
import CreateQuestion from '@/components/CreateQuestion';
import AvatarUpload from '@/components/AvatarUpload';
import FloatingAddButton from '@/components/FloatingAddButton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
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

import UserAvatar from '@/components/UserAvatar';
import { displayLocalTime } from '@/lib/frontend-time-utils';

interface UserStats {
  totalPosts: number;
  totalArticles: number;
  totalQuestions: number;
  totalViews: number;
  totalLikes: number;
  drafts: number;
  pending: number;
  published: number;
  rejected: number;
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
  _id: string;
  id?: string;
  type: 'info' | 'success' | 'rejection' | 'warning';
  title: string;
  content: string;
  relatedId?: string;
  relatedType?: string;
  isRead: boolean;
  createdAt: string;
  priority: 'low' | 'normal' | 'high';
}

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  createdAt: string;
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
    pending: 0,
    published: 0,
    rejected: 0
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 5;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editingPostType, setEditingPostType] = useState<'article' | 'question'>('article');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateQuestion, setShowCreateQuestion] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [messagesCurrentPage, setMessagesCurrentPage] = useState(1);
  const [messagesTotalPages, setMessagesTotalPages] = useState(1);
  const [messagesTotalCount, setMessagesTotalCount] = useState(0);
  const messagesPerPage = 5;

  const [unreadCount, setUnreadCount] = useState(0);
  
  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState(''); // 搜索输入框的值


  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pendingDeletePostId, setPendingDeletePostId] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  // 用户资料状态
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/user-center');
      return;
    }
    
    if (session?.user) {
      fetchUserData();
      fetchUserProfile();
      fetchMessages();
    }
  }, [session, status, router, currentPage, activeTab]);

  // 当消息分页改变时，重新获取消息
  useEffect(() => {
    if (session?.user && activeSection === 'messages') {
      fetchMessages();
    }
  }, [messagesCurrentPage, session, activeSection]);

  // 处理URL参数中的编辑请求和section参数
  useEffect(() => {
    const editId = searchParams.get('edit');
    const section = searchParams.get('section');
    
    if (editId && session?.user) {
      setEditingPost(editId);
      setShowCreatePost(true);
      setActiveSection('content'); // 切换到内容管理标签
      // 清除URL参数
      router.replace('/user-center', { scroll: false });
    } else if (section && ['profile', 'content', 'messages'].includes(section)) {
      setActiveSection(section);
      // 清除URL参数
      router.replace('/user-center', { scroll: false });
    }
  }, [searchParams, session, router]);

  // 点击外部区域关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // 检查是否点击了添加按钮或其下拉菜单
      if (dropdownOpen && !target.closest('.add-button-container')) {
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
      // 如果是搜索操作，显示搜索loading
      if (searchQuery) {
        setSearchLoading(true);
      }
      
      // 根据 activeTab 组装 status 参数
      let status = '';
      switch (activeTab) {
        case 'published': status = 'published'; break;
        case 'pending': status = 'pending'; break;
        case 'drafts': status = 'draft'; break;
        case 'rejected': status = 'rejected'; break;
        default: status = ''; // overview
      }
      const [statsRes, postsRes] = await Promise.all([
        fetch('/api/users/stats'),
        fetch(`/api/users/posts?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchQuery)}${status ? `&status=${status}` : ''}`)
      ]);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        // 兼容后端没有返回 published/rejected 时的情况
        setStats({
          totalPosts: statsData.totalPosts || 0,
          totalArticles: statsData.totalArticles || 0,
          totalQuestions: statsData.totalQuestions || 0,
          totalViews: statsData.totalViews || 0,
          totalLikes: statsData.totalLikes || 0,
          drafts: statsData.drafts || 0,
          pending: statsData.pending || 0,
          published: statsData.published || 0,
          rejected: statsData.rejected || 0
        });
      }
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
        setTotalCount(postsData.pagination?.total || 0);
      }
    } catch (error) {
      console.error('获取用户数据失败:', error);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  // 获取用户资料
  const fetchUserProfile = async () => {
    if (!session?.user?.email) return;
    
    try {
      const response = await fetch('/api/users/profile');
      if (response.ok) {
        const profileData = await response.json();
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error('获取用户资料失败:', error);
    }
  };

  // 处理头像更新
  const handleAvatarChange = (avatarUrl: string | undefined) => {
    setUserProfile(prev => prev ? { ...prev, avatar: avatarUrl } : null);
  };

  const fetchMessages = async () => {
    try {
      setMessagesLoading(true);
      const response = await fetch(`/api/users/messages?page=${messagesCurrentPage}&limit=${messagesPerPage}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setUnreadCount(data.unreadCount || 0);
        setMessagesTotalPages(data.pagination?.totalPages || 1);
        setMessagesTotalCount(data.pagination?.total || 0);
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

  // 计算分页数据
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // 执行搜索
  const executeSearch = () => {
    if (searchInput.trim()) {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }
  };




  // 当搜索或标签页改变时，重置到第一页并重新获取数据
  useEffect(() => {
    if (session?.user && activeSection === 'content') {
      fetchUserData();
    }
  }, [searchQuery, activeTab, session, activeSection]);

  // 当切换到消息标签时，重置消息分页到第一页
  useEffect(() => {
    if (activeSection === 'messages') {
      setMessagesCurrentPage(1);
    }
  }, [activeSection]);

  const handleEditPost = (postId: string) => {
    // 从posts数组中找到对应的文章，获取其类型
    const post = posts.find(p => p._id === postId);
    if (post) {
      setEditingPostType(post.type);
    }
    setEditingPost(postId);
    setShowCreatePost(true);
  };

  const handleDeletePost = (postId: string) => {
    setPendingDeletePostId(postId);
    setIsDeleteDialogOpen(true);
  };
  const confirmDeletePost = async () => {
    if (!pendingDeletePostId) return;
    setIsDeleteDialogOpen(false);
    try {
      const response = await fetch(`/api/posts/${pendingDeletePostId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setPosts(posts.filter(p => p._id !== pendingDeletePostId));
        fetchUserData();
        setDeleteResult('删除成功');
      } else {
        const errorData = await response.json();
        setDeleteResult(errorData.error || '删除失败');
      }
    } catch {
      setDeleteResult('删除失败，请重试');
    } finally {
      setPendingDeletePostId(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* 左侧导航 */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
              <div className="flex items-center space-x-4 mb-6">
                <UserAvatar 
                  avatar={userProfile?.avatar}
                  userName={session?.user?.name || session?.user?.email || '用户'}
                  size="lg"
                />
                <div>
                  <h1 className="text-lg font-bold text-foreground">{session?.user?.name}</h1>
                  <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                </div>
              </div>
              
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveSection('profile')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-left rounded-lg transition-colors ${
                    activeSection === 'profile'
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:bg-accent'
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
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>内容管理</span>
                  {stats.pending > 0 && (
                    <span className="ml-auto bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {stats.pending}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => setActiveSection('messages')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-left rounded-lg transition-colors ${
                    activeSection === 'messages'
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:bg-accent'
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
                <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                  <h2 className="text-xl font-bold text-foreground mb-6">个人资料</h2>
                  
                  {/* 头像上传区域 */}
                  <div className="mb-8">
                    <AvatarUpload
                      currentAvatar={userProfile?.avatar}
                      userName={session?.user?.name || '用户'}
                      onAvatarChange={handleAvatarChange}
                      className="mb-6"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">用户名</label>
                      <input
                        type="text"
                        value={userProfile?.name || session?.user?.name || ''}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">邮箱</label>
                      <input
                        type="email"
                        value={userProfile?.email || session?.user?.email || ''}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-foreground"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">加入时间</label>
                      <input
                        type="text"
                        value={userProfile?.createdAt 
                          ? displayLocalTime(userProfile.createdAt, 'datetime')
                          : displayLocalTime(new Date().toISOString(), 'datetime')
                        }
                        className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-foreground"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">用户类型</label>
                      <input
                        type="text"
                        value="普通用户"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-foreground"
                        readOnly
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-foreground mb-2">个人简介</label>
                    <textarea
                      rows={4}
                      value={userProfile?.bio || ''}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                      placeholder="介绍一下你自己..."
                      readOnly
                    />
                  </div>
                  
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-foreground mb-2">位置</label>
                    <input
                      type="text"
                      value={userProfile?.location || ''}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-foreground"
                      placeholder="你的位置"
                      readOnly
                    />
                  </div>
                  
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-foreground mb-2">个人网站</label>
                    <input
                      type="url"
                      value={userProfile?.website || ''}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-foreground"
                      placeholder="https://your-website.com"
                      readOnly
                    />
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                      保存更改
                    </button>
                  </div>
                </div>
                
                {/* 统计数据 */}
                <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">我的统计</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border border-border rounded-lg bg-background">
                      <div className="text-2xl font-bold text-blue-600">{stats.totalPosts}</div>
                      <div className="text-sm text-muted-foreground">总发布</div>
                    </div>
                    <div className="text-center p-4 border border-border rounded-lg bg-background">
                      <div className="text-2xl font-bold text-green-600">{stats.totalArticles}</div>
                      <div className="text-sm text-muted-foreground">文章</div>
                    </div>
                    <div className="text-center p-4 border border-border rounded-lg bg-background">
                      <div className="text-2xl font-bold text-orange-600">{stats.totalQuestions}</div>
                      <div className="text-sm text-muted-foreground">问题</div>
                    </div>
                    <div className="text-center p-4 border border-border rounded-lg bg-background">
                      <div className="text-2xl font-bold text-purple-600">{stats.totalViews}</div>
                      <div className="text-sm text-muted-foreground">浏览量</div>
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
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalPosts}</div>
                    <div className="text-sm text-muted-foreground">总发布</div>
                  </div>
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.totalArticles}</div>
                    <div className="text-sm text-muted-foreground">文章</div>
                  </div>
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.totalQuestions}</div>
                    <div className="text-sm text-muted-foreground">问题</div>
                  </div>
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                    <div className="text-sm text-muted-foreground">待审核</div>
                  </div>
                </div>

                {/* 内容管理 */}
                <div className="bg-card rounded-xl shadow-sm border border-border">
                  {/* 头部 */}
                  <div className="px-6 py-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-foreground">内容管理</h2>
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="搜索内容..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                executeSearch();
                              }
                            }}
                            className="pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-background text-foreground"
                          />
                          <svg className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          {searchInput && (
                            <button
                              onClick={() => setSearchInput('')}
                              className="absolute right-3 top-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors"
                              title="清空搜索"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <button
                          onClick={executeSearch}
                          disabled={!searchInput.trim() || searchLoading}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors text-sm flex items-center space-x-2"
                        >
                          {searchLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>搜索中...</span>
                            </>
                          ) : (
                            <span>搜索</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 搜索状态和结果统计 */}
                  {searchQuery && (
                    <div className="px-6 py-3 bg-muted/30 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span className="text-sm text-muted-foreground">
                            搜索: <span className="font-medium text-foreground">&quot;{searchQuery}&quot;</span>
                          </span>
                          {totalCount > 0 && (
                            <span className="text-sm text-muted-foreground">
                              • 找到 {totalCount} 个结果
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSearchInput('');
                            setSearchQuery('');
                          }}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          清除搜索
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 标签页 */}
                  <div className="border-b border-border">
                    <nav className="flex space-x-8 px-6" aria-label="Tabs">
                      {[
                        { id: 'overview', label: '全部内容', count: stats.totalPosts, icon: '📄' },
                        { id: 'published', label: '已发布', count: stats.published, icon: '✅' },
                        { id: 'pending', label: '待审核', count: stats.pending, icon: '⏳' },
                        { id: 'drafts', label: '草稿', count: stats.drafts, icon: '📝' },
                        { id: 'rejected', label: '已拒绝', count: stats.rejected, icon: '❌' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                            activeTab === tab.id
                              ? 'border-primary text-primary'
                              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                          }`}
                        >
                          <span>{tab.icon}</span>
                          <span>{tab.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            activeTab === tab.id
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-muted-foreground mt-2">加载中...</p>
                      </div>
                    ) : posts.length === 0 ? (
                      <div className="text-center py-12">
                        <svg className="w-16 h-16 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d={searchQuery.trim() ? "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" : "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"} />
                        </svg>
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          {searchQuery.trim() ? '未找到匹配的内容' : '暂无内容'}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {searchQuery.trim() 
                            ? `没有找到包含"${searchQuery}"的内容，请尝试其他关键词或检查拼写` 
                            : (activeTab === 'drafts' ? '你还没有保存任何草稿' : 
                               activeTab === 'pending' ? '你还没有待审核的内容' :
                               activeTab === 'published' ? '你还没有已发布的内容' :
                               activeTab === 'rejected' ? '你还没有被拒绝的内容' : 
                               '你还没有发布任何内容')
                          }
                        </p>
                        {searchQuery.trim() ? (
                          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3">
                            <button
                              onClick={() => {
                                setSearchInput('');
                                setSearchQuery('');
                              }}
                              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                            >
                              清除搜索
                            </button>
                            <span className="text-sm text-muted-foreground">或</span>
                            <Link
                              href="/"
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              开始创作新内容
                            </Link>
                          </div>
                        ) : (
                          <Link
                            href="/"
                            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            开始创作
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {posts.map((post) => (
                          <div key={post._id} className="group border border-border rounded-lg p-5 hover:shadow-md hover:border-border/50 transition-all duration-200 bg-gradient-to-r from-card to-background/50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-3">
                                  <span className={`inline-flex items-center px-2.5 py-1 text-xs rounded-full font-medium ${
                                    post.type === 'question' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                                  }`}>
                                    {post.type === 'question' ? '🤔 问题' : '📝 文章'}
                                  </span>
                                  {getStatusBadge(post.reviewStatus)}
                                  <span className="text-xs text-muted-foreground">
                                    {displayLocalTime(post.createdAt, 'datetime')}
                                  </span>
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-2 hover:text-primary cursor-pointer group-hover:text-primary transition-colors">
                                  {post.title}
                                </h3>
                                <div className="flex items-center space-x-6 text-sm text-muted-foreground">
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
                                  className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  title="查看"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </Link>
                                <button 
                                  onClick={() => handleEditPost(post._id)}
                                  className="p-2 text-muted-foreground hover:text-green-600 hover:bg-green-500/10 rounded-lg transition-colors"
                                  title="编辑"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={() => handleDeletePost(post._id)}
                                  className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
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
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center mt-6 pt-4 border-t border-border">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                href="#"
                                onClick={e => {
                                  e.preventDefault();
                                  setCurrentPage(prev => Math.max(prev - 1, 1));
                                }}
                                aria-disabled={currentPage === 1}
                              />
                            </PaginationItem>
                            {Array.from({ length: totalPages }).map((_, i) => (
                              <PaginationItem key={i + 1}>
                                <PaginationLink
                                  href="#"
                                  isActive={currentPage === i + 1}
                                  onClick={e => {
                                    e.preventDefault();
                                    setCurrentPage(i + 1);
                                  }}
                                >
                                  {i + 1}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                href="#"
                                onClick={e => {
                                  e.preventDefault();
                                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                                }}
                                aria-disabled={currentPage === totalPages}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 消息 */}
            {activeSection === 'messages' && (
              <div className="space-y-6">
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-foreground">消息中心</h2>
                    {unreadCount > 0 && (
                                              <button 
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/users/messages', {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ markAllAsRead: true }),
                              });
                              
                              if (response.ok) {
                                setUnreadCount(0);
                                // 重新获取消息列表
                                fetchMessages();
                                
                                // 触发全局消息更新事件，通知导航栏更新状态
                                window.dispatchEvent(new CustomEvent('message-updated'));
                              }
                            } catch (error) {
                              console.error('标记已读失败:', error);
                            }
                          }}
                          className="text-sm text-primary hover:text-primary/80"
                        >
                          标记全部已读
                        </button>
                    )}
                  </div>
                  
                  {messagesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">加载中...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <h3 className="text-lg font-medium text-foreground mb-2">暂无消息</h3>
                      <p className="text-muted-foreground">您还没有收到任何消息</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message._id || message.id} className={`border rounded-lg p-4 transition-all duration-200 ${
                          message.isRead ? 'border-border bg-muted/50' : 'border-primary/20 bg-primary/5'
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
                                <h3 className="font-medium text-foreground">{message.title}</h3>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-muted-foreground">
                                    {displayLocalTime(message.createdAt, 'datetime')}
                                  </span>
                                  {!message.isRead && (
                                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {message.content}
                              </p>
                              {message.relatedId && (
                                <div className="mt-2">
                                                                      <Link
                                      href={`/posts/${message.relatedId}`}
                                      onClick={async () => {
                                        // 如果消息未读，标记为已读
                                        if (!message.isRead) {
                                          try {
                                            const response = await fetch('/api/users/messages', {
                                              method: 'PATCH',
                                              headers: {
                                                'Content-Type': 'application/json',
                                              },
                                              body: JSON.stringify({ 
                                                messageIds: [message._id || message.id] 
                                              }),
                                            });
                                            
                                            if (response.ok) {
                                              // 更新本地状态
                                              setMessages(prev => prev.map(msg => 
                                                msg._id === message._id || msg.id === message.id 
                                                  ? { ...msg, isRead: true }
                                                  : msg
                                              ));
                                              setUnreadCount(prev => Math.max(0, prev - 1));
                                              
                                              // 触发全局消息更新事件，通知导航栏更新状态
                                              window.dispatchEvent(new CustomEvent('message-updated'));
                                            }
                                          } catch (error) {
                                            console.error('标记消息已读失败:', error);
                                          }
                                        }
                                      }}
                                      className="text-sm text-primary hover:text-primary/80"
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
                  
                  {/* 消息分页 */}
                  {messagesTotalPages > 1 && (
                    <div className="flex items-center justify-center mt-6 pt-4 border-t border-border">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={e => {
                                e.preventDefault();
                                setMessagesCurrentPage(prev => Math.max(prev - 1, 1));
                              }}
                              aria-disabled={messagesCurrentPage === 1}
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.min(messagesTotalPages, 5) }).map((_, i) => {
                            // 计算要显示的页码，优先显示当前页附近的页码
                            let pageNum;
                            if (messagesTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (messagesCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (messagesCurrentPage >= messagesTotalPages - 2) {
                              pageNum = messagesTotalPages - 4 + i;
                            } else {
                              pageNum = messagesCurrentPage - 2 + i;
                            }
                            
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  href="#"
                                  isActive={messagesCurrentPage === pageNum}
                                  onClick={e => {
                                    e.preventDefault();
                                    setMessagesCurrentPage(pageNum);
                                  }}
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={e => {
                                e.preventDefault();
                                setMessagesCurrentPage(prev => Math.min(prev + 1, messagesTotalPages));
                              }}
                              aria-disabled={messagesCurrentPage === messagesTotalPages}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                  
                  {/* 分页信息 */}
                  {messagesTotalPages > 1 && (
                    <div className="text-center text-sm text-muted-foreground mt-2">
                      第 {messagesCurrentPage} 页，共 {messagesTotalPages} 页
                      {messagesTotalCount > 0 && ` (共 ${messagesTotalCount} 条消息)`}
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
      {/* 删除确认弹窗 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除这个内容吗？</AlertDialogTitle>
            <AlertDialogDescription>删除后不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePost}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* 删除结果提示弹窗 */}
      <AlertDialog open={!!deleteResult} onOpenChange={() => setDeleteResult(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteResult}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteResult(null)}>确定</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 浮动添加按钮 - 仅在内容管理页面显示 */}
      {activeSection === 'content' && (
        <FloatingAddButton
          onCreateArticle={() => {
            setShowCreatePost(true);
            setEditingPostType('article');
          }}
          onCreateQuestion={() => {
            setShowCreateQuestion(true);
          }}
        />
      )}

      {/* 创建问题模态框 */}
      {showCreateQuestion && (
        <CreateQuestion
          onClose={() => setShowCreateQuestion(false)}
          onQuestionCreated={() => {
            setShowCreateQuestion(false);
            fetchUserData(); // 重新获取数据
          }}
        />
      )}

      {/* 创建新文章模态框 */}
      {showCreatePost && !editingPost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onPostCreated={() => {
            setShowCreatePost(false);
            fetchUserData(); // 重新获取数据
          }}
        />
      )}
    </div>
  );
} 