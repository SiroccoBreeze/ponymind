'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { displayLocalTime } from '@/lib/frontend-time-utils';
import { 
  Filter, 
  Download, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  Info,
  AlertCircle,
  Bug,
  Calendar,
  User,
  FileText,
  Database,
  Shield,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Log {
  _id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  category: 'system' | 'auth' | 'api' | 'database' | 'file' | 'user' | 'admin' | 'post' | 'comment' | 'upload' | 'behavior' | 'resource' | 'event' | 'tag' | 'message' | 'search' | 'settings' | 'scheduled_task' | 'system_parameter' | 'user_status' | 'performance' | 'security';
  userId?: string;
  userEmail?: string;
  ip?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  tags?: string[];
}

interface LogsResponse {
  logs: Log[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const levelColors = {
  error: 'bg-red-100 text-red-800 border-red-200',
  warn: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  debug: 'bg-gray-100 text-gray-800 border-gray-200'
};

const levelIcons = {
  error: AlertTriangle,
  warn: AlertCircle,
  info: Info,
  debug: Bug
};

const categoryIcons = {
  system: Settings,
  auth: Shield,
  api: FileText,
  database: Database,
  file: FileText,
  user: User,
  admin: Shield,
  post: FileText,
  comment: FileText,
  upload: FileText,
  behavior: User,
  resource: FileText,
  event: Calendar,
  tag: FileText,
  message: FileText,
  search: FileText,
  settings: Settings,
  scheduled_task: Calendar,
  system_parameter: Settings,
  user_status: User,
  performance: Database,
  security: Shield
};

export default function LogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  // 获取当天的日期字符串 (YYYY-MM-DD 格式)
  const getTodayString = () => {
    const today = new Date();
    // 使用本地时间，避免时区问题
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [filters, setFilters] = useState({
    level: 'all',
    category: 'all',
    startDate: getTodayString(),
    endDate: getTodayString(),
    search: ''
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    fetchLogs();
  }, [session, status, filters, pagination.page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // 过滤掉 'all' 值，转换为空字符串以适配 API
      const apiFilters = { ...filters };
      if (apiFilters.level === 'all') apiFilters.level = '';
      if (apiFilters.category === 'all') apiFilters.category = '';
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...apiFilters
      });

      const response = await fetch(`/api/admin/logs?${params}`);
      if (!response.ok) throw new Error('获取日志失败');

      const data: LogsResponse = await response.json();
      setLogs(data.logs);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (error) {
      toast.error('获取日志失败');
      console.error('获取日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({
      level: 'all',
      category: 'all',
      startDate: getTodayString(),
      endDate: getTodayString(),
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleLogClick = (log: Log) => {
    setSelectedLog(log);
    setLogDialogOpen(true);
  };

  const handleCleanupLogs = async (days: number) => {
    try {
      const response = await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days })
      });

      if (!response.ok) throw new Error('清理日志失败');

      const result = await response.json();
      toast.success(result.message);
      fetchLogs();
    } catch (error) {
      toast.error('清理日志失败');
      console.error('清理日志失败:', error);
    }
  };

  const exportLogs = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({
        ...filters,
        export: format
      });

      const response = await fetch(`/api/admin/logs?${params}`);
      if (!response.ok) throw new Error('导出失败');

      if (format === 'csv') {
        const blob = new Blob([await response.text()], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      toast.success('导出成功');
    } catch (error) {
      toast.error('导出失败');
      console.error('导出失败:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">系统日志</h1>
          <p className="text-muted-foreground">查看系统运行日志和错误信息</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchLogs()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button onClick={() => exportLogs('csv')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出CSV
          </Button>
          <Button onClick={() => exportLogs('json')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出JSON
          </Button>
        </div>
      </div>

      {/* 筛选器 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            筛选条件
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            当前筛选时间范围：{filters.startDate} 00:00:00 至 {filters.endDate} 23:59:59
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">日志级别</label>
              <Select value={filters.level} onValueChange={(value) => handleFilterChange('level', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="全部级别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部级别</SelectItem>
                  <SelectItem value="error">错误</SelectItem>
                  <SelectItem value="warn">警告</SelectItem>
                  <SelectItem value="info">信息</SelectItem>
                  <SelectItem value="debug">调试</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">日志类别</label>
              <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="全部类别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类别</SelectItem>
                  <SelectItem value="system">系统</SelectItem>
                  <SelectItem value="auth">认证</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="database">数据库</SelectItem>
                  <SelectItem value="file">文件</SelectItem>
                  <SelectItem value="user">用户</SelectItem>
                  <SelectItem value="admin">管理</SelectItem>
                  <SelectItem value="post">帖子</SelectItem>
                  <SelectItem value="comment">评论</SelectItem>
                  <SelectItem value="upload">上传</SelectItem>
                  <SelectItem value="behavior">行为</SelectItem>
                  <SelectItem value="resource">资源</SelectItem>
                  <SelectItem value="event">事件</SelectItem>
                  <SelectItem value="tag">标签</SelectItem>
                  <SelectItem value="message">消息</SelectItem>
                  <SelectItem value="search">搜索</SelectItem>
                  <SelectItem value="settings">设置</SelectItem>
                  <SelectItem value="scheduled_task">定时任务</SelectItem>
                  <SelectItem value="system_parameter">系统参数</SelectItem>
                  <SelectItem value="user_status">用户状态</SelectItem>
                  <SelectItem value="performance">性能</SelectItem>
                  <SelectItem value="security">安全</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">开始日期</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">结束日期</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">搜索</label>
              <Input
                placeholder="搜索消息或用户邮箱"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={handleClearFilters} variant="outline" size="sm">
                清除筛选
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">错误日志</p>
                <p className="text-2xl font-bold text-red-600">
                  {logs.filter(log => log.level === 'error').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">警告日志</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {logs.filter(log => log.level === 'warn').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">信息日志</p>
                <p className="text-2xl font-bold text-blue-600">
                  {logs.filter(log => log.level === 'info').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">总日志数</p>
                <p className="text-2xl font-bold text-green-600">{pagination.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>日志列表</CardTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  清理日志
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>清理日志</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要清理30天前的日志吗？此操作不可恢复。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleCleanupLogs(30)}>
                    确定清理
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无日志数据
            </div>
          ) : (
            <div className="space-y-4">
                             {logs.map((log) => {
                 const LevelIcon = levelIcons[log.level];
                 const CategoryIcon = categoryIcons[log.category];
                 
                 return (
                   <div 
                     key={log._id} 
                     className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                     onClick={() => handleLogClick(log)}
                     title="点击查看详细信息"
                   >
                                         <div className="flex items-start justify-between">
                       <div className="flex items-center gap-3">
                         <LevelIcon className={`h-5 w-5 ${log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-yellow-500' : log.level === 'info' ? 'text-blue-500' : 'text-gray-500'}`} />
                         <Badge className={levelColors[log.level]}>
                           {log.level.toUpperCase()}
                         </Badge>
                         <div className="flex items-center gap-2">
                           <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                           <Badge variant="outline">{log.category}</Badge>
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="text-sm text-muted-foreground">
                           {displayLocalTime(log.timestamp, 'datetime')}
                         </div>
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                         </div>
                       </div>
                     </div>

                    <div className="text-sm font-medium">{log.message}</div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      {log.userEmail && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{log.userEmail}</span>
                        </div>
                      )}
                      {log.path && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{log.method} {log.path}</span>
                        </div>
                      )}
                      {log.ip && (
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          <span>{log.ip}</span>
                        </div>
                      )}
                    </div>

                    {log.tags && log.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {log.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 分页 */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                显示第 {pagination.page} 页，共 {pagination.pages} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.pages}
                >
                  下一页
                </Button>
              </div>
            </div>
                     )}
         </CardContent>
       </Card>

                               {/* 日志详情弹框 */}
          <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
                       <DialogContent 
              className="max-h-[90vh] !max-w-none"
              style={{ width: '80vw', maxWidth: '1200px' }}
            >
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${
                  selectedLog?.level === 'error' ? 'bg-red-500' : 
                  selectedLog?.level === 'warn' ? 'bg-yellow-500' : 
                  selectedLog?.level === 'info' ? 'bg-blue-500' : 'bg-gray-500'
                }`} />
                <span className="text-xl font-semibold">日志详情</span>
                <Badge className={`ml-2 ${
                  selectedLog?.level === 'error' ? 'bg-red-100 text-red-800 border-red-200' : 
                  selectedLog?.level === 'warn' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                  selectedLog?.level === 'info' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-800 border-gray-200'
                }`}>
                  {selectedLog?.level?.toUpperCase()}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            
                          {selectedLog && (
               <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
                                  {/* 消息内容 - 突出显示 */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      日志消息
                    </h3>
                    <p className="text-blue-800 text-lg leading-relaxed">{selectedLog.message}</p>
                  </div>

                                  {/* 基本信息 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-gray-600" />
                        基本信息
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-gray-100">
                          <span className="text-gray-600 font-medium text-base">日志ID:</span>
                          <span className="font-mono text-sm bg-gray-100 px-3 py-2 rounded max-w-[300px] truncate" title={selectedLog._id}>{selectedLog._id}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-100">
                          <span className="text-gray-600 font-medium text-base">级别:</span>
                          <Badge className={`${levelColors[selectedLog.level]} text-sm px-3 py-1`}>
                            {selectedLog.level.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-100">
                          <span className="text-gray-600 font-medium text-base">分类:</span>
                          <Badge variant="outline" className="capitalize text-sm px-3 py-1">{selectedLog.category.replace('_', ' ')}</Badge>
                        </div>
                        <div className="flex justify-between items-center py-3">
                          <span className="text-gray-600 font-medium text-base">时间:</span>
                          <span className="text-gray-900 font-medium text-base">{displayLocalTime(selectedLog.timestamp, 'datetime')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-gray-600" />
                        用户信息
                      </h3>
                      <div className="space-y-4">
                        {selectedLog.userId && (
                          <div className="flex justify-between items-center py-3 border-b border-gray-100">
                            <span className="text-gray-600 font-medium text-base">用户ID:</span>
                            <span className="font-mono text-sm bg-gray-100 px-3 py-2 rounded max-w-[300px] truncate" title={selectedLog.userId}>{selectedLog.userId}</span>
                          </div>
                        )}
                        {selectedLog.userEmail && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600 font-medium text-base">用户邮箱:</span>
                            <span className="text-gray-900 font-medium text-base max-w-[300px] truncate" title={selectedLog.userEmail}>{selectedLog.userEmail}</span>
                          </div>
                        )}
                        {selectedLog.ip && (
                          <div className="flex justify-between items-center py-3">
                            <span className="text-gray-600 font-medium text-base">IP地址:</span>
                            <span className="font-mono bg-gray-100 px-3 py-2 rounded">{selectedLog.ip}</span>
                          </div>
                        )}
                        {!selectedLog.userId && !selectedLog.userEmail && !selectedLog.ip && (
                          <div className="text-center py-8 text-gray-500 text-base">
                            无用户相关信息
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                                  {/* 请求信息 */}
                  {(selectedLog.path || selectedLog.method || selectedLog.statusCode) && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-600" />
                        请求信息
                      </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedLog.method && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">方法:</span>
                          <Badge variant="outline" className="font-mono">{selectedLog.method}</Badge>
                        </div>
                      )}
                      {selectedLog.path && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">路径:</span>
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded max-w-[200px] truncate" title={selectedLog.path}>
                            {selectedLog.path}
                          </span>
                        </div>
                      )}
                      {selectedLog.statusCode && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600 font-medium">状态码:</span>
                          <Badge variant={selectedLog.statusCode >= 400 ? 'destructive' : 'outline'}>
                            {selectedLog.statusCode}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                                  {/* 标签 */}
                  {selectedLog.tags && selectedLog.tags.length > 0 && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-600" />
                        标签
                      </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedLog.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs px-3 py-1">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                                  {/* 原始数据 */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Database className="h-5 w-5 text-gray-600" />
                      原始数据
                    </h3>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto border border-gray-700">
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap">
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* 操作按钮 - 固定在底部 */}
            <div className="flex justify-between items-center pt-4 border-t bg-white mt-4">
              <div className="text-sm text-gray-500">
                日志ID: {selectedLog?._id}
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setLogDialogOpen(false)}
                  className="px-6"
                >
                  关闭
                </Button>
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                    toast.success('日志数据已复制到剪贴板');
                  }}
                  className="px-6"
                >
                  复制数据
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
     </div>
   );
 }
