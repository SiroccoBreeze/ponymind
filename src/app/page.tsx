'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CreatePost from '@/components/CreatePost';
import PostList from '@/components/PostList';
import SearchBar from '@/components/SearchBar';

export default function Home() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchFilters, setSearchFilters] = useState({
    search: '',
    tag: '',
    author: ''
  });
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalQuestions: 0,
    totalUsers: 0,
    totalAnswers: 0
  });
  const [realTimeStats, setRealTimeStats] = useState<{
    hotPosts: Array<{
      _id: string;
      title: string;
      type: string;
      views: number;
      answers: number;
      likes: number;
      createdAt: string;
    }>;
    popularTags: Array<{
      name: string;
      count: number;
    }>;
    stats: {
      todayPosts: number;
      todayComments: number;
      unansweredQuestions: number;
    };
    activeUsers: Array<{
      name: string;
      reputation: number;
      weekActivity: number;
      badge: string;
    }>;
  }>({
    hotPosts: [],
    popularTags: [],
    stats: {
      todayPosts: 0,
      todayComments: 0,
      unansweredQuestions: 0
    },
    activeUsers: []
  });
  const [showCreatePost, setShowCreatePost] = useState(false);

  const handlePostCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowCreatePost(false);
  };

  const handleCreateArticle = () => {
    setShowCreatePost(true);
  };

  const handleCreateQuestion = () => {
    router.push('/ask');
  };

  // 从URL参数初始化搜索状态
  useEffect(() => {
    setSearchFilters({
      search: searchParams.get('search') || '',
      tag: searchParams.get('tag') || '',
      author: searchParams.get('author') || ''
    });
  }, [searchParams]);

  // 获取统计数据
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 获取真实统计数据
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setRealTimeStats(data);
        } else {
          console.error('获取统计数据失败');
        }
      } catch (error) {
        console.error('获取统计数据失败:', error);
      }
    };
    fetchStats();
  }, [refreshTrigger]);

  const handleSearch = (filters: { search: string; tag: string; author: string }) => {
    setSearchFilters(filters);
    setRefreshTrigger(prev => prev + 1);
  };

  const tabs = [
    { id: 'all', label: '全部内容', icon: '📋' },
    { id: 'questions', label: '问题', icon: '❓' },
    { id: 'articles', label: '文章', icon: '📝' },
    { id: 'unanswered', label: '待回答', icon: '🔍' },
    { id: 'trending', label: '热门', icon: '🔥' }
  ];

  const sortOptions = [
    { id: 'newest', label: '最新发布' },
    { id: 'active', label: '最近活跃' },
    { id: 'votes', label: '最多点赞' },
    { id: 'views', label: '最多浏览' },

  ];

  return (
    <div className="min-h-screen bg-gray-50">
      

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧主内容区 */}
          <div className="lg:col-span-3">
            {/* SearchBar */}
            <SearchBar onSearch={handleSearch} />

            {/* 创建内容区域 */}
            {session && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">有什么想分享的？</p>
                      <p className="text-xs text-gray-500">与社区一起学习和成长</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCreateArticle}
                      className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200 border border-blue-200"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      写文章
                    </button>
                    <button
                      onClick={handleCreateQuestion}
                      className="flex items-center px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors duration-200 border border-orange-200"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      提问题
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 内容筛选和排序 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              {/* 标签页 */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  {tabs.map((tab) => (
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
                    </button>
                  ))}
                </nav>
              </div>

              {/* 排序选项 */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">排序方式:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {!session && (
                  <div className="flex items-center space-x-3">
                    <Link
                      href="/auth/signin"
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      登录
                    </Link>
                    <Link
                      href="/auth/register"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      注册
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* 内容列表 */}
            <div className="space-y-4">
              <PostList 
                refreshTrigger={refreshTrigger}
                activeTab={activeTab}
                sortBy={sortBy}
                searchFilters={searchFilters}
              />
            </div>
          </div>

          {/* 右侧边栏 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 今日热点 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🔥</span>
                今日热点
              </h3>
              <div className="space-y-3">
                {realTimeStats.hotPosts.length > 0 ? realTimeStats.hotPosts.map((item, index) => (
                  <Link 
                    key={index} 
                    href={`/posts/${item._id}`}
                    className="block hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-start space-x-3 p-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        item.type === 'question' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {item.type === 'question' ? '?' : 'A'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.type === 'question' ? `${item.answers} 个回答` : `${item.views} 次浏览`}
                          {item.likes > 0 && ` • ${item.likes} 点赞`}
                        </p>
                      </div>
                    </div>
                  </Link>
                )) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    暂无热点内容
                  </div>
                )}
              </div>
            </div>

            {/* 热门标签 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">热门标签</h3>
              <div className="flex flex-wrap gap-2">
                {realTimeStats.popularTags.length > 0 ? realTimeStats.popularTags.map((tag) => (
                  <Link
                    key={tag.name}
                    href={`/?tag=${tag.name}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-blue-100 hover:text-blue-800 transition-colors duration-200"
                  >
                    {tag.name}
                    <span className="ml-1 text-gray-500">{tag.count}</span>
                  </Link>
                )) : (
                  <div className="text-center py-2 text-gray-500 text-sm">
                    暂无标签数据
                  </div>
                )}
              </div>
            </div>

            {/* 问答统计 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">社区统计</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">今日新内容</span>
                  <span className="text-sm font-semibold text-blue-600">{realTimeStats.stats.todayPosts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">今日新回答</span>
                  <span className="text-sm font-semibold text-green-600">{realTimeStats.stats.todayComments}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">待解决问题</span>
                  <span className="text-sm font-semibold text-orange-600">{realTimeStats.stats.unansweredQuestions}</span>
                </div>

              </div>
            </div>

            {/* 活跃用户 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">本周活跃用户</h3>
              <div className="space-y-3">
                {realTimeStats.activeUsers.length > 0 ? realTimeStats.activeUsers.map((user, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <span className="text-lg">{user.badge}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">
                        {user.reputation} 声望 • 本周活跃度 {user.weekActivity}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    暂无活跃用户数据
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 创作模态框 */}
      {showCreatePost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
}

