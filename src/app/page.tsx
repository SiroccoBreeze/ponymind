'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CreatePost from '@/components/CreatePost';
import PostList from '@/components/PostList';
import NewSearchBar from '@/components/NewSearchBar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

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
            {/* NewSearchBar */}
            <NewSearchBar onSearch={handleSearch} />

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
            <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-xs">🔥</span>
                  </div>
                  今日热点
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {realTimeStats.hotPosts.length > 0 ? realTimeStats.hotPosts.map((item, index) => (
                    <Link 
                      key={index} 
                      href={`/posts/${item._id}`}
                      className="block hover:bg-muted/50 transition-colors duration-200 rounded-lg"
                    >
                      <div className="flex items-start space-x-3 p-3">
                        <Badge 
                          variant={item.type === 'question' ? 'destructive' : 'default'}
                          className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs"
                        >
                          {item.type === 'question' ? '?' : 'A'}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.type === 'question' ? `${item.answers} 个回答` : `${item.views} 次浏览`}
                            {item.likes > 0 && ` • ${item.likes} 点赞`}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      暂无热点内容
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 热门标签 */}
            <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  热门标签
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {realTimeStats.popularTags.length > 0 ? realTimeStats.popularTags.map((tag, index) => (
                    <Badge
                      key={tag.name}
                      variant={searchFilters.tag === tag.name ? "default" : "secondary"}
                      className={cn(
                        "cursor-pointer transition-all duration-200 gap-1.5 px-3 py-1.5 text-sm font-medium",
                        searchFilters.tag === tag.name 
                          ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 scale-105" 
                          : "bg-secondary/80 hover:bg-primary/10 hover:text-primary hover:border-primary/20 hover:shadow-sm hover:scale-105",
                        index < 3 && "ring-2 ring-primary/10"
                      )}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        // 保留其他筛选条件
                        if (searchFilters.search) params.set('search', searchFilters.search);
                        if (searchFilters.author) params.set('author', searchFilters.author);
                        
                        // 如果当前标签已经选中，则清除标签筛选
                        const newTag = searchFilters.tag === tag.name ? '' : tag.name;
                        if (newTag) {
                          params.set('tag', newTag);
                        }
                        
                        // 更新 URL
                        router.push(`/?${params.toString()}`);
                        
                        // 立即更新搜索状态和触发刷新
                        const newFilters = {
                          ...searchFilters,
                          tag: newTag
                        };
                        setSearchFilters(newFilters);
                        setRefreshTrigger(prev => prev + 1);
                        
                        // 通知搜索栏组件更新
                        handleSearch(newFilters);
                      }}
                    >
                      <span>{tag.name}</span>
                      <span className={cn(
                        "text-xs font-normal px-1.5 py-0.5 rounded-full",
                        searchFilters.tag === tag.name 
                          ? "bg-white/20 text-white" 
                          : "bg-primary/10 text-primary"
                      )}>
                        {tag.count}
                      </span>
                    </Badge>
                  )) : (
                    <div className="text-center py-4 text-muted-foreground text-sm w-full">
                      <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      暂无标签数据
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 问答统计 */}
            <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">#</span>
                  </div>
                  社区统计
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">今日新内容</span>
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      {realTimeStats.stats.todayPosts}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">今日新回答</span>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      {realTimeStats.stats.todayComments}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">待解决问题</span>
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      {realTimeStats.stats.unansweredQuestions}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 活跃用户 */}
            <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-green-600">👥</span>
                  </div>
                  本周活跃用户
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {realTimeStats.activeUsers.length > 0 ? realTimeStats.activeUsers.map((user, index) => (
                    <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-lg">{user.badge}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {user.reputation} 声望
                          </Badge>
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            活跃度 {user.weekActivity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      暂无活跃用户数据
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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

