'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CreatePost from '@/components/CreatePost';
import PostList from '@/components/PostList';
import SearchBar from '@/components/SearchBar';

export default function Home() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
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

  const handlePostCreated = () => {
    setRefreshTrigger(prev => prev + 1);
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
        // 模拟统计数据
        setStats({
          totalPosts: 1240,
          totalQuestions: 856,
          totalUsers: 342,
          totalAnswers: 2150
        });
      } catch (error) {
        console.error('获取统计数据失败:', error);
      }
    };
    fetchStats();
  }, []);

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
    { id: 'bounty', label: '悬赏问题' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧主内容区 */}
          <div className="lg:col-span-3">
            {/* 搜索栏 */}
            <SearchBar onSearch={handleSearch} />

            {/* 发布内容区域 */}
            {session && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">发布内容</h2>
                  <Link
                    href="/ask"
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    💡 快速提问
                  </Link>
                </div>
                <CreatePost onPostCreated={handlePostCreated} />
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
                {[
                  { title: 'React 18 新特性详解', type: 'article', views: 1250 },
                  { title: 'JavaScript 闭包问题求助', type: 'question', answers: 5 },
                  { title: 'Vue 3 组合式 API 最佳实践', type: 'article', views: 980 },
                  { title: 'TypeScript 类型推导疑问', type: 'question', answers: 3 },
                  { title: 'Node.js 性能优化指南', type: 'article', views: 756 }
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200">
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
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 热门标签 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">热门标签</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'javascript', count: 1250 },
                  { name: 'react', count: 980 },
                  { name: 'python', count: 856 },
                  { name: 'vue', count: 742 },
                  { name: 'typescript', count: 689 },
                  { name: 'node.js', count: 567 },
                  { name: 'css', count: 445 },
                  { name: 'html', count: 389 },
                  { name: 'mongodb', count: 334 },
                  { name: 'express', count: 298 }
                ].map((tag) => (
                  <Link
                    key={tag.name}
                    href={`/?tag=${tag.name}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-blue-100 hover:text-blue-800 transition-colors duration-200"
                  >
                    {tag.name}
                    <span className="ml-1 text-gray-500">{tag.count}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* 问答统计 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">社区统计</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">今日新问题</span>
                  <span className="text-sm font-semibold text-blue-600">24</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">今日新回答</span>
                  <span className="text-sm font-semibold text-green-600">67</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">待解决问题</span>
                  <span className="text-sm font-semibold text-orange-600">156</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">悬赏问题</span>
                  <span className="text-sm font-semibold text-purple-600">12</span>
                </div>
              </div>
            </div>

            {/* 活跃用户 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">本周活跃用户</h3>
              <div className="space-y-3">
                {[
                  { name: 'Alex Chen', reputation: 2840, badge: '🥇' },
                  { name: 'Sarah Wang', reputation: 2156, badge: '🥈' },
                  { name: 'Mike Zhang', reputation: 1923, badge: '🥉' },
                  { name: 'Lisa Liu', reputation: 1687, badge: '⭐' },
                  { name: 'Tom Wilson', reputation: 1456, badge: '⭐' }
                ].map((user, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <span className="text-lg">{user.badge}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.reputation} 声望</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
