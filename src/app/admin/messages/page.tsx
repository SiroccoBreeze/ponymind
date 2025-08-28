'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle,
  Bell,
  RefreshCw,
  Eye,
  FileText,
  MessageCircle,
  Clock,
  User,
  Trash2
} from 'lucide-react';
import { displayLocalTime } from '@/lib/frontend-time-utils';

interface AdminMessage {
  _id: string;
  type: 'info' | 'success' | 'rejection' | 'warning' | 'comment_reply' | 'post_like' | 'comment_like';
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
  relatedType?: 'post' | 'comment' | 'user';
  sender?: {
    name: string;
    email: string;
    avatar?: string;
  };
  recipient?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

interface PendingStats {
  pendingPosts: number;
  pendingComments: number;
}

interface MessageData {
  messages: AdminMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  unreadCount: number;
  pendingStats: PendingStats;
}

export default function AdminMessagesPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<MessageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (session) {
      fetchMessages();
    }
  }, [session, currentPage]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/messages?page=${currentPage}&limit=20`);
      if (response.ok) {
        const messageData = await response.json();
        setData(messageData);
      }
    } catch (error) {
      console.error('获取消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      const response = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messageIds: [messageId] 
        }),
      });
      
      if (response.ok) {
        // 更新本地状态
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map(msg => 
              msg._id === messageId 
                ? { ...msg, isRead: true }
                : msg
            ),
            unreadCount: Math.max(0, prev.unreadCount - 1)
          };
        });
      }
    } catch (error) {
      console.error('标记消息已读失败:', error);
    }
  };

  const markSelectedAsRead = async () => {
    if (selectedMessages.size === 0) return;

    try {
      const response = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messageIds: Array.from(selectedMessages)
        }),
      });
      
      if (response.ok) {
        // 更新本地状态
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map(msg => 
              selectedMessages.has(msg._id)
                ? { ...msg, isRead: true }
                : msg
            ),
            unreadCount: Math.max(0, prev.unreadCount - selectedMessages.size)
          };
        });
        setSelectedMessages(new Set());
      }
    } catch (error) {
      console.error('标记选中消息已读失败:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      
      if (response.ok) {
        // 更新本地状态
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map(msg => ({ ...msg, isRead: true })),
            unreadCount: 0
          };
        });
        setSelectedMessages(new Set());
      }
    } catch (error) {
      console.error('标记所有消息已读失败:', error);
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'rejection':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'comment_reply':
        return <MessageCircle className="h-5 w-5 text-purple-500" />;
      case 'post_like':
        return <MessageSquare className="h-5 w-5 text-pink-500" />;
      case 'comment_like':
        return <MessageCircle className="h-5 w-5 text-pink-500" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-500" />;
    }
  };

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'rejection':
        return '拒绝';
      case 'success':
        return '成功';
      case 'warning':
        return '警告';
      case 'info':
        return '信息';
      case 'comment_reply':
        return '评论回复';
      case 'post_like':
        return '帖子点赞';
      case 'comment_like':
        return '评论点赞';
      default:
        return '其他';
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'rejection':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'success':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredMessages = data?.messages.filter(message => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !message.isRead;
    if (activeTab === 'pending') return message.type === 'warning' || message.type === 'info';
    return message.type === activeTab;
  }) || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
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
        
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
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
          <div className="text-muted-foreground text-6xl">📬</div>
          <p className="text-muted-foreground text-lg">加载消息失败</p>
          <Button onClick={fetchMessages}>
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            消息中心
          </h1>
          <p className="text-muted-foreground">管理系统消息和通知</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchMessages} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          {data.unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              全部已读
            </Button>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500 rounded-xl">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-700">总消息数</h3>
                <p className="text-2xl font-bold text-blue-600">{data.pagination.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-500 rounded-xl">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-700">待审核内容</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {data.pendingStats.pendingPosts + data.pendingStats.pendingComments}
                </p>
                <p className="text-sm text-orange-600">
                  帖子: {data.pendingStats.pendingPosts} | 评论: {data.pendingStats.pendingComments}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-green-100/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-500 rounded-xl">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-700">未读消息</h3>
                <p className="text-2xl font-bold text-green-600">{data.unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 消息列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              消息列表
            </CardTitle>
            {selectedMessages.size > 0 && (
              <Button onClick={markSelectedAsRead} variant="outline" size="sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                标记选中为已读 ({selectedMessages.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                全部 ({data.pagination.total})
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                未读 ({data.unreadCount})
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                待处理
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                系统消息
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
              <div className="space-y-4">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">暂无消息</p>
                    <p className="text-sm">当前分类下没有消息</p>
                  </div>
                ) : (
                  filteredMessages.map((message) => (
                    <Card 
                      key={message._id} 
                      className={`transition-all duration-200 hover:shadow-md ${
                        !message.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* 选择框 */}
                          <input
                            type="checkbox"
                            checked={selectedMessages.has(message._id)}
                            onChange={() => toggleMessageSelection(message._id)}
                            className="mt-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          
                          {/* 消息图标 */}
                          <div className="flex-shrink-0 mt-1">
                            {getMessageIcon(message.type)}
                          </div>
                          
                          {/* 消息内容 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className={`font-medium ${!message.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {message.title}
                              </h3>
                              <Badge variant="outline" className={`text-xs ${getMessageTypeColor(message.type)}`}>
                                {getMessageTypeLabel(message.type)}
                              </Badge>
                              {!message.isRead && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                  未读
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                              {message.content}
                            </p>
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {displayLocalTime(message.createdAt, 'datetime')}
                                </span>
                                
                                {message.relatedType && (
                                  <span className="flex items-center gap-1">
                                    {message.relatedType === 'post' ? (
                                      <FileText className="h-3 w-3" />
                                    ) : message.relatedType === 'comment' ? (
                                      <MessageCircle className="h-3 w-3" />
                                    ) : (
                                      <User className="h-3 w-3" />
                                    )}
                                    {message.relatedType === 'post' ? '帖子' : 
                                     message.relatedType === 'comment' ? '评论' : '用户'}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {!message.isRead && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markMessageAsRead(message._id)}
                                    className="h-6 px-2 text-xs"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    标记已读
                                  </Button>
                                )}
                                
                                {message.relatedId && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    查看
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
              
              {/* 分页 */}
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <div className="text-sm text-muted-foreground">
                    显示第 {((data.pagination.page - 1) * data.pagination.limit) + 1} - {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} 条，
                    共 {data.pagination.total} 条消息
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={!data.pagination.hasPrev}
                    >
                      上一页
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {data.pagination.page} / {data.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(data.pagination.totalPages, prev + 1))}
                      disabled={!data.pagination.hasNext}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
