'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CreatePost from '@/components/CreatePost';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowRight, 
  BookOpen, 
  MessageSquare, 
  Users, 
  TrendingUp,
  Sparkles,
  FileText, 
  Calendar,
  Zap,
  Heart,
  Eye,
  Tag,
  Database,
  Star,
  Award,
  Rocket,
  Lightbulb,
  Target,
  BarChart3,
  Clock,
  FileBarChart
} from 'lucide-react';

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<{
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
  }>({
    hotPosts: [],
    popularTags: [],
    stats: {
      todayPosts: 0,
      todayComments: 0,
      unansweredQuestions: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);

  // 获取首页数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePostCreated = () => {
    setShowCreatePost(false);
    // 刷新统计数据
    const fetchData = async () => {
      try {
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      }
    };
    fetchData();
  };

  const features = [
    {
      icon: BookOpen,
      title: '知识库',
      description: '浏览和分享技术文章、问题与答案',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      gradient: 'from-blue-500/20 to-blue-600/10',
      link: '/knowledge'
    },
    {
      icon: Calendar,
      title: '事件管理',
      description: '记录和追踪重要事件与活动',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      gradient: 'from-purple-500/20 to-purple-600/10',
      link: '/events'
    },
    {
      icon: Database,
      title: '资源中心',
      description: '收藏和管理各类学习资源',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      gradient: 'from-green-500/20 to-green-600/10',
      link: '/resources'
    },
    {
      icon: FileBarChart,
      title: '报表中心',
      description: '查看各类报表和统计数据',
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
      gradient: 'from-indigo-500/20 to-indigo-600/10',
      link: '/reports'
    },
    {
      icon: Users,
      title: '社区互动',
      description: '与其他用户交流和分享经验',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      gradient: 'from-orange-500/20 to-orange-600/10',
      link: '/user-center'
    }
  ];

  const quickActions = [
    {
      icon: FileText,
      label: '发布文章',
      description: '分享你的知识和见解',
      action: () => setShowCreatePost(true),
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Zap,
      label: '提问',
      description: '寻求社区的帮助',
      action: () => router.push('/ask'),
      gradient: 'from-yellow-500 to-orange-500'
    },
    {
      icon: Calendar,
      label: '查看事件',
      description: '浏览最新事件',
      action: () => router.push('/events'),
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: Database,
      label: '浏览资源',
      description: '发现优质资源',
      action: () => router.push('/resources'),
      gradient: 'from-green-500 to-emerald-500'
    }
  ];

  const statsCards = [
    {
      label: '今日新内容',
      value: stats.stats.todayPosts,
      icon: FileText,
      color: 'text-blue-500',
      bgGradient: 'from-blue-500/20 to-blue-600/10',
      iconBg: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      label: '今日新回答',
      value: stats.stats.todayComments,
      icon: MessageSquare,
      color: 'text-green-500',
      bgGradient: 'from-green-500/20 to-green-600/10',
      iconBg: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    },
    {
      label: '待解决问题',
      value: stats.stats.unansweredQuestions,
      icon: Zap,
      color: 'text-orange-500',
      bgGradient: 'from-orange-500/20 to-orange-600/10',
      iconBg: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20'
    }
  ];

    return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - 增强版 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background via-50% to-primary/5">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32 relative">
          <div className="text-center space-y-8">
            {/* 欢迎标签 - 增强版 */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/20 backdrop-blur-sm shadow-lg">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-semibold text-primary">欢迎来到 PonyMind</span>
              <Rocket className="w-4 h-4 text-primary" />
            </div>
            
            {/* 主标题 - 增强版 */}
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight">
                <span className="block bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent">
                  构建你的
                </span>
                <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent animate-gradient">
                  知识管理平台
                </span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                一个集<span className="font-semibold text-foreground">知识分享</span>、<span className="font-semibold text-foreground">问答交流</span>、<span className="font-semibold text-foreground">事件管理</span>和<span className="font-semibold text-foreground">资源收藏</span>于一体的综合性平台
              </p>
            </div>
            
            {/* 行动按钮 - 增强版 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              {session ? (
                <>
                  <Button 
                    size="lg" 
                    className="gap-2 px-8 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" 
                    onClick={() => router.push('/knowledge')}
                  >
                    进入知识库
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="gap-2 px-8 h-12 text-base font-semibold border-2 hover:scale-105 transition-all duration-300" 
                    onClick={() => router.push('/ask')}
                  >
                    <Zap className="w-5 h-5" />
                    立即提问
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    className="gap-2 px-8 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" 
                    onClick={() => router.push('/auth/signin')}
                  >
                    立即开始
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="gap-2 px-8 h-12 text-base font-semibold border-2 hover:scale-105 transition-all duration-300" 
                    onClick={() => router.push('/knowledge')}
                  >
                    <BookOpen className="w-5 h-5" />
                    浏览内容
                  </Button>
                </>
              )}
            </div>

            {/* 特色亮点 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-12 max-w-3xl mx-auto">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Lightbulb className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">知识分享</p>
                  <p className="text-xs text-muted-foreground">分享你的见解</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">精准搜索</p>
                  <p className="text-xs text-muted-foreground">快速找到内容</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">社区认可</p>
                  <p className="text-xs text-muted-foreground">获得他人认可</p>
                </div>
                              </div>
                              </div>
                              </div>
                              </div>
      </section>

      {/* Stats Section - 美化版 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index} 
                className={`relative overflow-hidden border-2 ${stat.borderColor} bg-gradient-to-br ${stat.bgGradient} hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl"></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      {isLoading ? (
                        <Skeleton className="h-10 w-20 mt-2" />
                      ) : (
                        <p className="text-4xl font-extrabold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                          {stat.value}
                        </p>
                      )}
                    </div>
                    <div className={`p-4 rounded-2xl ${stat.iconBg} group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Features Section - 美化版 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-b from-transparent to-muted/20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-4">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">核心功能</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            平台功能
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            探索 PonyMind 提供的强大功能，让知识管理变得简单高效
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Link key={index} href={feature.link}>
                <Card className="h-full group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 cursor-pointer">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  <CardContent className="p-6 relative">
                    <div className={`w-14 h-14 rounded-2xl ${feature.bgColor} flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
                      <Icon className={`w-7 h-7 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="font-semibold">了解更多</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
              </CardContent>
            </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick Actions Section - 美化版 */}
      {session && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-4">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">快速开始</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              快速操作
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              快速开始你的工作，让创作变得简单高效
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Card 
                  key={index} 
                  className="cursor-pointer group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2"
                  onClick={action.action}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                  <CardContent className="p-6 text-center relative">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{action.label}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Hot Content Section - 美化版 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-b from-muted/20 to-transparent">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">热门内容</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            发现精彩内容
          </h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 热门内容 */}
          <Card className="border-2 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                    热门内容
                </CardTitle>
                  <CardDescription className="mt-2">最受欢迎的文章和问题</CardDescription>
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  实时
                </Badge>
              </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="space-y-2 p-4 rounded-lg border">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      </div>
                    ))
                ) : stats.hotPosts.length > 0 ? (
                  stats.hotPosts.slice(0, 5).map((post, index) => (
                    <Link 
                      key={post._id} 
                      href={`/posts/${post._id}`}
                      className="block p-4 rounded-xl hover:bg-accent transition-all duration-300 group border hover:border-primary/50"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-base font-bold text-primary shadow-lg group-hover:scale-110 transition-transform`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-3">
                            {post.title}
                          </h4>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted">
                              <Eye className="w-3.5 h-3.5" />
                              <span className="font-medium">{post.views}</span>
                            </div>
                            {post.type === 'question' && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted">
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span className="font-medium">{post.answers}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted">
                              <Heart className="w-3.5 h-3.5" />
                              <span className="font-medium">{post.likes}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">暂无热门内容</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 热门标签 */}
          <Card className="border-2 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Tag className="w-6 h-6 text-primary" />
                    </div>
                  热门标签
                </CardTitle>
                  <CardDescription className="mt-2">探索社区关注的话题</CardDescription>
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  <Clock className="w-3 h-3 mr-1" />
                  本周
                </Badge>
              </div>
              </CardHeader>
              <CardContent>
              <div className="space-y-2">
                  {isLoading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-12 rounded-full" />
                      </div>
                    ))
                ) : stats.popularTags.length > 0 ? (
                  stats.popularTags.slice(0, 8).map((tag) => (
                    <Link
                      key={tag.name}
                      href={`/knowledge?tag=${tag.name}`}
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-accent transition-all duration-300 group border hover:border-primary/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <Tag className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-semibold group-hover:text-primary transition-colors">
                          {tag.name}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-sm font-bold px-3 py-1 shadow-sm">
                        {tag.count}
                      </Badge>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Tag className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-sm">暂无标签数据</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
                          </div>
      </section>

      {/* CTA Section - 美化版 */}
      {!session && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <Card className="relative overflow-hidden border-2 bg-gradient-to-br from-primary/10 via-background to-primary/5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
            <CardContent className="p-16 text-center relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 mb-6">
                <Rocket className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">开始你的旅程</span>
                          </div>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                准备好开始了吗？
              </h2>
              <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
                加入 PonyMind 社区，开始你的知识管理之旅，与其他用户一起学习和成长
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="lg" 
                  className="gap-2 px-8 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" 
                  onClick={() => router.push('/auth/signin')}
                >
                  立即注册
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="gap-2 px-8 h-12 text-base font-semibold border-2 hover:scale-105 transition-all duration-300" 
                  onClick={() => router.push('/knowledge')}
                >
                  <BookOpen className="w-5 h-5" />
                  了解更多
                </Button>
                </div>
              </CardContent>
            </Card>
        </section>
      )}

      {/* 创建文章模态框 */}
      {showCreatePost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
}
