'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CreatePost from '@/components/CreatePost';
import PostList from '@/components/PostList';
import FilterBar from '@/components/FilterBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

import { 
  Tag, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  FileText, 
  Zap,
  Edit3,
  Activity,
  Calendar,
  Eye,
  Heart,
  Star
} from 'lucide-react';
import FloatingAddButton from '@/components/FloatingAddButton';


export default function KnowledgePage() {
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
  const [isLoading, setIsLoading] = useState(true);


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
        setIsLoading(true);
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
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [refreshTrigger]);

  const handleSearch = (filters: { search: string; tag: string; author: string }) => {
    setSearchFilters(filters);
    setRefreshTrigger(prev => prev + 1);
  };



    return (
    <div className="min-h-screen bg-background">
      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* 左侧主内容区 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 搜索区域 */}
            <FilterBar onSearch={handleSearch} />

            {/* 内容筛选和排序 */}
            <Card>
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <TabsList className="grid w-full grid-cols-5 sm:grid-cols-5 lg:w-auto lg:grid-cols-5">
                      <TabsTrigger value="all" className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground data-[state=active]:text-primary transition-colors" />
                        <span className="hidden sm:inline">全部</span>
                      </TabsTrigger>
                      <TabsTrigger value="questions" className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-muted-foreground data-[state=active]:text-primary transition-colors" />
                        <span className="hidden sm:inline">问题</span>
                      </TabsTrigger>
                      <TabsTrigger value="articles" className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-muted-foreground data-[state=active]:text-primary transition-colors" />
                        <span className="hidden sm:inline">文章</span>
                      </TabsTrigger>
                      <TabsTrigger value="unanswered" className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground data-[state=active]:text-primary transition-colors" />
                        <span className="hidden sm:inline">待答</span>
                      </TabsTrigger>
                      <TabsTrigger value="trending" className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground data-[state=active]:text-primary transition-colors" />
                        <span className="hidden sm:inline">热门</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary transition-colors" />
                        <span className="text-sm font-medium text-muted-foreground">排序:</span>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                                最新发布
                              </div>
                            </SelectItem>
                            <SelectItem value="active">
                              <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                                最近活跃
                              </div>
                            </SelectItem>
                            <SelectItem value="votes">
                              <div className="flex items-center gap-2">
                                <Heart className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                                最多点赞
                              </div>
                            </SelectItem>
                            <SelectItem value="views">
                              <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                                最多浏览
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                    </div>
                  </div>
                  
                  <Separator className="mb-6" />
                  
                  <TabsContent value="all" className="mt-0">
                    <PostList 
                      refreshTrigger={refreshTrigger}
                      activeTab="all"
                      sortBy={sortBy}
                      searchFilters={searchFilters}
                    />
                  </TabsContent>
                  <TabsContent value="questions" className="mt-0">
                    <PostList 
                      refreshTrigger={refreshTrigger}
                      activeTab="questions"
                      sortBy={sortBy}
                      searchFilters={searchFilters}
                    />
                  </TabsContent>
                  <TabsContent value="articles" className="mt-0">
                    <PostList 
                      refreshTrigger={refreshTrigger}
                      activeTab="articles"
                      sortBy={sortBy}
                      searchFilters={searchFilters}
                    />
                  </TabsContent>
                  <TabsContent value="unanswered" className="mt-0">
                    <PostList 
                      refreshTrigger={refreshTrigger}
                      activeTab="unanswered"
                      sortBy={sortBy}
                      searchFilters={searchFilters}
                    />
                  </TabsContent>
                  <TabsContent value="trending" className="mt-0">
              <PostList 
                refreshTrigger={refreshTrigger}
                      activeTab="trending"
                sortBy={sortBy}
                searchFilters={searchFilters}
              />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

          </div>

          {/* 右侧边栏 - 添加 Sticky 效果 */}
          <div className="lg:col-span-1 space-y-4 lg:space-y-6">
            <div className="lg:sticky lg:top-6 space-y-4 lg:space-y-6">
              {/* 今日热点 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary transition-colors animate-pulse" />
                    今日热点
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {isLoading ? (
                      // 加载骨架屏
                      Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-2/3" />
                          </div>
                        </div>
                      ))
                    ) : realTimeStats.hotPosts.length > 0 ? realTimeStats.hotPosts.map((item, index) => (
                      <Link 
                        key={index} 
                        href={`/posts/${item._id}`}
                        className="block hover:bg-accent transition-all duration-200 rounded-lg group relative overflow-hidden"
                      >
                        {/* 热度趋势指示器 */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 via-orange-500 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
                             style={{ 
                               height: `${Math.min(100, (item.views + item.likes) / 10)}%`,
                               background: index === 0 
                                 ? 'linear-gradient(to bottom, #ef4444, #f97316)' 
                                 : index === 1 
                                 ? 'linear-gradient(to bottom, #f97316, #fb923c)' 
                                 : 'linear-gradient(to bottom, #fb923c, #fbbf24)'
                             }}
                        />
                        <div className="flex items-start space-x-3 p-3 relative">
                          {/* 热度排名 */}
                          <div className={`w-8 h-8 rounded-full p-0 flex items-center justify-center text-xs font-bold relative ${
                            index === 0 
                              ? 'bg-gradient-to-br from-red-500 to-orange-500' 
                              : index === 1 
                              ? 'bg-gradient-to-br from-orange-500 to-amber-500' 
                              : index === 2
                              ? 'bg-gradient-to-br from-amber-500 to-yellow-500'
                              : 'bg-primary'
                          }`}>
                            {index < 3 ? (
                              <span className="text-white font-bold text-sm">{index + 1}</span>
                            ) : item.type === 'question' ? (
                              <Zap className="w-4 h-4 text-primary-foreground" />
                            ) : (
                              <FileText className="w-4 h-4 text-primary-foreground" />
                            )}
                            {/* 火焰效果 */}
                            {index === 0 && (
                              <span className="absolute -top-1 -right-1 text-xs">🔥</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {item.views}
                              </div>
                              {item.likes > 0 && (
                                <div className="flex items-center gap-1">
                                  <Heart className="w-3 h-3 fill-red-500/20 text-red-500" />
                                  {item.likes}
                                </div>
                              )}
                              {/* 热度指示 */}
                              <div className="flex items-center gap-1 ml-auto">
                                <TrendingUp className="w-3 h-3 text-orange-500" />
                                <span className="text-orange-500 font-semibold">
                                  {(item.views + item.likes * 2).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">暂无热点内容</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 热门标签 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary transition-colors" />
                    热门标签
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2">
                  {isLoading ? (
                    // 加载骨架屏
                    Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <Skeleton className="w-3 h-3" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="w-8 h-6 rounded-full" />
                      </div>
                    ))
                  ) : realTimeStats.popularTags.length > 0 ? realTimeStats.popularTags.map((tag) => (
                    <Button
                      key={tag.name}
                      variant={searchFilters.tag === tag.name ? "default" : "ghost"}
                      size="sm"
                      className="justify-between h-auto p-3"
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
                        router.push(`/knowledge?${params.toString()}`);
                        
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
                      <div className="flex items-center gap-2">
                        <Tag className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" />
                        <span className="font-medium">{tag.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs font-bold">
                        {tag.count}
                      </Badge>
                    </Button>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">暂无标签数据</p>
                    </div>
                  )}
                </div>
              </CardContent>
              </Card>

              {/* 社区统计 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary transition-colors" />
                    社区统计
                  </CardTitle>
                </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {isLoading ? (
                    // 加载骨架屏
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <Skeleton className="w-12 h-8 rounded" />
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary rounded-full">
                            <FileText className="w-4 h-4 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">今日新内容</p>
                            <p className="text-xs text-muted-foreground">发布的文章和问题</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-bold text-lg px-3 py-1">
                          {realTimeStats.stats.todayPosts}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary rounded-full">
                            <MessageSquare className="w-4 h-4 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">今日新回答</p>
                            <p className="text-xs text-muted-foreground">社区互动活跃度</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-bold text-lg px-3 py-1">
                          {realTimeStats.stats.todayComments}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary rounded-full">
                            <Zap className="w-4 h-4 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">待解决问题</p>
                            <p className="text-xs text-muted-foreground">等待你的回答</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-bold text-lg px-3 py-1">
                          {realTimeStats.stats.unansweredQuestions}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
              </Card>

              {/* 活跃用户 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-4 text-primary transition-colors" />
                    本周活跃用户
                  </CardTitle>
                </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isLoading ? (
                    // 加载骨架屏
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <div className="flex gap-2">
                            <Skeleton className="h-5 w-12" />
                            <Skeleton className="h-5 w-12" />
                          </div>
                        </div>
                        <Skeleton className="w-8 h-8" />
                      </div>
                    ))
                  ) : realTimeStats.activeUsers.length > 0 ? realTimeStats.activeUsers.map((user, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors group border">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={`/api/placeholder/40/40?text=${user.name.charAt(0)}`} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold group-hover:text-foreground transition-colors">
                          {user.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            <Star className="w-3 h-3 mr-1 text-muted-foreground hover:text-primary transition-colors" />
                            {user.reputation}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            <Activity className="w-3 h-3 mr-1 text-muted-foreground hover:text-primary transition-colors" />
                            {user.weekActivity}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-2xl group-hover:scale-110 transition-transform">
                        {user.badge}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">暂无活跃用户数据</p>
                    </div>
                  )}
                </div>
              </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* 浮动添加按钮 */}
      {session && (
        <FloatingAddButton
          onCreateArticle={handleCreateArticle}
          onCreateQuestion={handleCreateQuestion}
        />
      )}

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

