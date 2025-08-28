'use client';

import { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Plus, Play, Edit, Trash2, Clock, Loader2 } from 'lucide-react';
import { displayLocalTime } from '@/lib/frontend-time-utils';

interface ScheduledTask {
  _id: string;
  name: string;
  description: string;
  taskType: string;
  isEnabled: boolean;
  schedule: string;
  lastRun: string | null;
  nextRun: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastResult: {
    success: boolean;
    message: string;
    details?: any;
    duration: number;
  };
  config: any;
  createdAt: string;
  updatedAt: string;
}

interface SystemInfo {
  version: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
  };
  cpuUsage: number[];
  totalMemory: number;
  freeMemory: number;
  timestamp: string;
}

export default function ScheduledTasks() {
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [executingTask, setExecutingTask] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 加载数据的函数
  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const [tasksResponse, systemInfoResponse] = await Promise.all([
        fetch('/api/admin/scheduled-tasks'),
        fetch('/api/admin/system-info')
      ]);

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setScheduledTasks(tasksData.tasks);
      }

      if (systemInfoResponse.ok) {
        const systemInfoData = await systemInfoResponse.json();
        setSystemInfo(systemInfoData.systemInfo);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // 初始加载
    loadData();
  }, []);

  // 定时任务相关函数
  const handleSaveTask = async (taskData: any) => {
    try {
      const url = taskData.taskId ? '/api/admin/scheduled-tasks' : '/api/admin/scheduled-tasks';
      const method = taskData.taskId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        // 立即重新加载任务列表，确保新任务显示
        await loadData(false);
        
        setShowTaskModal(false);
        setEditingTask(null);
        alert(taskData.taskId ? '任务更新成功' : '任务创建成功');
      } else {
        const errorData = await response.json();
        alert(`操作失败: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('保存任务失败:', error);
      alert('操作失败');
    }
  };

  const handleExecuteTask = async (taskId: string) => {
    setExecutingTask(taskId);
    try {
      const response = await fetch('/api/admin/scheduled-tasks/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      if (response.ok) {
        const responseData = await response.json();
        const result = responseData.result;
        
        if (result && result.success) {
          alert(`任务执行成功: ${result.message}`);
        } else {
          alert(`任务执行失败: ${result?.message || '未知错误'}`);
        }
        
        // 立即重新加载任务列表
        await loadData(false);
      } else {
        const errorData = await response.json();
        alert(`执行失败: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('执行任务失败:', error);
      alert('执行失败');
    } finally {
      setExecutingTask(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/scheduled-tasks?taskId=${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 立即重新加载任务列表
        await loadData(false);
        alert('任务删除成功');
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('删除任务失败:', error);
      alert('删除失败');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">运行中</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">已完成</Badge>;
      case 'failed':
        return <Badge variant="destructive">失败</Badge>;
      default:
        return <Badge variant="secondary">空闲</Badge>;
    }
  };

  const getEnabledBadge = (enabled: boolean) => {
    return enabled ? 
      <Badge variant="default" className="bg-green-100 text-green-800">启用</Badge> : 
      <Badge variant="secondary">禁用</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">正在加载定时任务...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">定时任务</h1>
          <p className="text-gray-600 mt-2">管理系统定时任务，包括图片清理、用户状态更新等</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => loadData(true)}
            variant="outline"
            className="flex items-center space-x-2"
            disabled={refreshing}
          >
            <Loader2 className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? '刷新中...' : '刷新'}</span>
          </Button>
          <Button 
            onClick={() => {
              setEditingTask(null);
              setShowTaskModal(true);
            }}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>添加任务</span>
          </Button>
        </div>
      </div>

      {/* 系统信息卡片 */}
      {systemInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>系统信息</span>
            </CardTitle>
            <CardDescription>当前系统运行状态和资源使用情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">系统版本:</span>
                  <span className="font-medium">{systemInfo.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Node.js 版本:</span>
                  <span className="font-medium">{systemInfo.nodeVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">运行时间:</span>
                  <span className="font-medium">{systemInfo.uptime} 小时</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">内存使用:</span>
                  <span className="font-medium">
                    {systemInfo.memoryUsage.used}MB / {systemInfo.memoryUsage.total}MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">系统内存:</span>
                  <span className="font-medium">
                    {systemInfo.freeMemory}GB / {systemInfo.totalMemory}GB 可用
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">系统平台:</span>
                  <span className="font-medium">{systemInfo.platform} ({systemInfo.arch})</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">任务总数:</span>
                  <span className="font-medium">{scheduledTasks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">运行中:</span>
                  <span className="font-medium">
                    {scheduledTasks.filter(t => t.status === 'running').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">已启用:</span>
                  <span className="font-medium">
                    {scheduledTasks.filter(t => t.isEnabled).length}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 定时任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle>任务列表</CardTitle>
          <CardDescription>所有已配置的定时任务</CardDescription>
        </CardHeader>
        <CardContent>
          {scheduledTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Clock className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无定时任务</h3>
              <p className="text-gray-500 mb-4">创建第一个定时任务来开始自动化管理</p>
              <Button 
                onClick={() => {
                  setEditingTask(null);
                  setShowTaskModal(true);
                }}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                创建第一个任务
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledTasks.map((task) => (
                <div key={task._id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-medium text-gray-900">{task.name}</h4>
                        {getEnabledBadge(task.isEnabled)}
                        {getStatusBadge(task.status)}
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">任务类型:</span>
                          <span className="ml-1">{task.taskType}</span>
                        </div>
                        <div>
                          <span className="font-medium">执行计划:</span>
                          <span className="ml-1">{task.schedule}</span>
                        </div>
                        <div>
                          <span className="font-medium">下次执行:</span>
                          <span className="ml-1">{displayLocalTime(task.nextRun, 'datetime')}</span>
                        </div>
                        {task.lastRun && (
                          <div>
                            <span className="font-medium">上次执行:</span>
                            <span className="ml-1">{displayLocalTime(task.lastRun, 'datetime')}</span>
                          </div>
                        )}
                      </div>
                      
                      {task.lastResult && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {task.lastResult.success ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className={`text-sm font-medium ${
                                task.lastResult.success ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {task.lastResult.message}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              耗时: {task.lastResult.duration}ms
                            </span>
                          </div>
                          {task.lastResult.details && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              <pre className="whitespace-pre-wrap">{JSON.stringify(task.lastResult.details, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        onClick={() => handleExecuteTask(task._id)}
                        disabled={task.status === 'running' || executingTask === task._id}
                        size="sm"
                        variant="outline"
                      >
                        {executingTask === task._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        <span className="ml-2">
                          {executingTask === task._id ? '执行中...' : '立即执行'}
                        </span>
                      </Button>
                      
                      <Button
                        onClick={() => {
                          setEditingTask(task);
                          setShowTaskModal(true);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="ml-2">编辑</span>
                      </Button>
                      
                      <Button
                        onClick={() => handleDeleteTask(task._id)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="ml-2">删除</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 定时任务模态框 */}
      {showTaskModal && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
        />
      )}
    </div>
  );
}

// 定时任务模态框组件
function TaskModal({ task, onClose, onSave }: { 
  task: ScheduledTask | null; 
  onClose: () => void; 
  onSave: (taskData: any) => void; 
}) {
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    taskType: task?.taskType || 'cleanupUnusedImages',
    schedule: task?.schedule || '0 2 * * *',
    isEnabled: task?.isEnabled ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(task ? { ...formData, taskId: task._id } : formData);
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md w-full">
        <AlertDialogHeader>
          <AlertDialogTitle>{task ? '编辑定时任务' : '添加定时任务'}</AlertDialogTitle>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">任务名称</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="输入任务名称"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">任务描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="描述任务的功能和用途"
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="taskType">任务类型</Label>
            <Select value={formData.taskType} onValueChange={(value) => setFormData(prev => ({ ...prev, taskType: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cleanupUnusedImages">清理未使用图片</SelectItem>
                <SelectItem value="updateInactiveUsers">更新非活跃用户状态</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="schedule">执行计划 (Cron表达式)</Label>
            <Input
              id="schedule"
              type="text"
              value={formData.schedule}
              onChange={(e) => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
              placeholder="0 2 * * *"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              格式: 分钟 小时 日 月 星期 (例如: 0 2 * * * 表示每天凌晨2点)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isEnabled"
              checked={formData.isEnabled}
              onChange={(e) => setFormData(prev => ({ ...prev, isEnabled: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <Label htmlFor="isEnabled">启用任务</Label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button" onClick={onClose}>取消</AlertDialogCancel>
            <AlertDialogAction type="submit">保存</AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
