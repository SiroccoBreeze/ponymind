'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  FileText, 
  Eye, 
  Heart, 
  TrendingUp, 
  UserPlus, 
  Tag,
  ArrowRight,
  Activity,
  Clock,
  BarChart3,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Crown
} from 'lucide-react';
import { displayLocalTime } from '@/lib/frontend-time-utils';

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
    pending: {
      pendingPosts: number;
      pendingComments: number;
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
    return displayLocalTime(dateString, 'datetime');
  };

  const formatTime = (date: Date) => {
    return displayLocalTime(date.toISOString(), 'full');
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-16 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="text-muted-foreground text-6xl">📊</div>
          <p className="text-muted-foreground text-lg">加载数据失败</p>
          <Button onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 页面标题和时间 */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            仪表板
          </h1>
          <p className="text-muted-foreground">欢迎来到 PonyMind 管理后台，实时监控系统状态</p>
        </div>
        <Card className="w-auto border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="text-right space-y-1">
              <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>当前时间</span>
              </div>
              <p className="text-lg font-mono text-primary">{formatTime(currentTime)}</p>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatNumber(data.overview.users.totalUsers)}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              本月新增 {data.overview.users.newUsersThisMonth}
            </p>
            <Progress value={75} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总内容数</CardTitle>
            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg">
              <FileText className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatNumber(data.overview.posts.totalPosts)}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              本月新增 {data.overview.posts.newPostsThisMonth}
            </p>
            <Progress value={60} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总浏览量</CardTitle>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
              <Eye className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatNumber(data.overview.posts.totalViews)}</div>
            <p className="text-xs text-muted-foreground">累计浏览次数</p>
            <Progress value={85} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总点赞数</CardTitle>
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
              <Heart className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatNumber(data.overview.posts.totalLikes)}</div>
            <p className="text-xs text-muted-foreground">累计点赞次数</p>
            <Progress value={70} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-orange-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待审核内容</CardTitle>
            <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatNumber(data.overview.pending.pendingPosts + data.overview.pending.pendingComments)}
            </div>
            <p className="text-xs text-muted-foreground">
              帖子: {data.overview.pending.pendingPosts} | 评论: {data.overview.pending.pendingComments}
            </p>
            <Progress value={Math.min(100, ((data.overview.pending.pendingPosts + data.overview.pending.pendingComments) / 10) * 100)} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* 详细统计 */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            用户统计
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            内容统计
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle>用户分析</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/users">
                      详细管理
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">活跃用户</span>
                  </div>
                  <span className="font-bold text-green-600">{formatNumber(data.overview.users.activeUsers)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <Crown className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">管理员</span>
                  </div>
                  <span className="font-bold text-blue-600">{formatNumber(data.overview.users.adminUsers)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <UserPlus className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium">本月新用户</span>
                  </div>
                  <span className="font-bold text-purple-600">
                    {formatNumber(data.overview.users.newUsersThisMonth)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle>用户活动</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/users">
                      查看全部
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recentActivity.recentUsers.slice(0, 5).map((user) => (
                    <div key={user._id} className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-lg transition-colors group">
                      <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-blue-200 transition-all">
                        <AvatarImage src={user.avatar || undefined} alt={user.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium group-hover:text-green-600 transition-colors">
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      <Badge variant={
                        user.role === 'admin' 
                          ? 'destructive'
                          : user.role === 'moderator'
                          ? 'secondary'
                          : 'outline'
                      } className="group-hover:scale-105 transition-transform">
                        {user.role === 'admin' ? '管理员' : user.role === 'moderator' ? '版主' : '用户'}
                      </Badge>
                    </div>
                  ))}
                  {data.recentActivity.recentUsers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>暂无新用户</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle>内容分析</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/posts">
                      详细管理
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">文章</span>
                  </div>
                  <span className="font-bold text-blue-600">{formatNumber(data.overview.posts.articles)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium">问题</span>
                  </div>
                  <span className="font-bold text-purple-600">{formatNumber(data.overview.posts.questions)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium">待解决问题</span>
                  </div>
                  <span className="font-bold text-orange-600">
                    {formatNumber(data.overview.posts.openQuestions)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle>最新内容</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/posts">
                      查看全部
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recentActivity.recentPosts.slice(0, 5).map((post) => (
                    <div key={post._id} className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-lg transition-colors group">
                      <div className="flex-shrink-0">
                        <Badge variant={post.type === 'article' ? 'default' : 'secondary'} className="group-hover:scale-105 transition-transform">
                          {post.type === 'article' ? '文章' : '问题'}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                          {post.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {post.author?.name} • {formatDate(post.createdAt)}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-xs text-muted-foreground text-right space-y-1">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>{post.views}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="h-3 w-3" />
                          <span>{post.likes}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {data.recentActivity.recentPosts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>暂无内容</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 热门标签 */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <Tag className="h-5 w-5 text-white" />
              </div>
              <CardTitle>热门标签</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/tags">
                管理标签
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.charts.topTags.slice(0, 20).map((tag) => (
              <Badge key={tag._id} variant="outline" className="hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 cursor-pointer transition-all group">
                <span className="group-hover:scale-105 transition-transform">{tag._id}</span>
                <Badge variant="secondary" className="ml-2 text-xs bg-purple-100 text-purple-700">
                  {tag.count}
                </Badge>
              </Badge>
            ))}
            {data.charts.topTags.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无标签数据</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 