'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import UserAvatar from '@/components/UserAvatar'
import ImagePreview from '@/components/ui/ImagePreview'
import { 
  RefreshCw,
  Upload,
  X,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'

type EventItem = {
  _id: string
  title: string
  description?: string
  category?: string
  status?: 'planned' | 'in-progress' | 'done' | 'canceled'
  occurredAt: string
  attachments?: Array<{ _id: string; originalName: string; url: string; size: number; mimetype: string }>
  creator?: { _id: string; name: string; avatar?: string; email?: string }
}

interface EventFormData {
  title: string;
  description: string;
  category: 'change' | 'release' | 'other';
  occurredAt: string;
  attachmentIds: string[];
}

interface UploadedAttachment {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  isConfirmed: boolean;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [isMounted, setIsMounted] = useState<boolean>(true)
  
  // 创建事件弹框状态 - 完全匹配管理端
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    category: 'other',
    occurredAt: '',
    attachmentIds: []
  });
  const [saving, setSaving] = useState(false);
  
  // 附件相关状态 - 完全匹配管理端
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<UploadedAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingAttachment, setDeletingAttachment] = useState<string | null>(null);

  async function fetchEvents(signal?: AbortSignal) {
    try {
      if (!isMounted) return
      setLoading(true)
      const res = await fetch('/api/events', { signal })
      const json = await res.json()
      if (json?.success && isMounted) {
        setEvents(json.data)
      }
    } catch (error) {
      // 忽略 AbortError，这是正常的组件卸载行为
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      // 检查是否是 DOMException 类型的 AbortError
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      if (isMounted) {
        console.error('获取事件列表失败:', error)
      }
    } finally {
      if (isMounted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchEvents(controller.signal)
    return () => {
      setIsMounted(false)
      controller.abort()
    }
  }, [])

  const groupedByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>()
    for (const e of events) {
      const key = format(new Date(e.occurredAt), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [events])

  // 重置表单 - 完全匹配管理端逻辑
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'other',
      occurredAt: new Date().toISOString().slice(0, 16),
      attachmentIds: []
    });
    setSelectedFiles([]);
    setUploadedAttachments([]);
    setUploadProgress(0);
    setDeletingAttachment(null);
  };

  // 清理已上传的附件 - 管理端的关键逻辑
  const cleanupAttachments = async () => {
    if (uploadedAttachments.length === 0) return;
    
    try {
      // 并行删除所有已上传的附件
      const deletePromises = uploadedAttachments.map(async (attachment) => {
        try {
          const response = await fetch(`/api/images/${attachment.id}`, {
            method: 'DELETE'
          });
          if (!response.ok) {
            console.error(`删除附件失败: ${attachment.originalName}`);
          }
        } catch (error) {
          console.error(`删除附件出错: ${attachment.originalName}`, error);
        }
      });
      
      await Promise.all(deletePromises);
      console.log('已清理所有临时附件');
    } catch (error) {
      console.error('清理附件时出错:', error);
    }
  };

  // 打开创建对话框 - 匹配管理端逻辑
  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  // 关闭对话框时的处理 - 完全匹配管理端逻辑
  const handleDialogClose = async () => {
    // 如果有已上传的附件，需要清理
    if (uploadedAttachments.length > 0) {
      await cleanupAttachments();
    }
    setIsCreateDialogOpen(false);
    resetForm();
  };

  // 保存事件 - 完全匹配管理端逻辑
  const handleSave = async () => {
    if (!formData.title.trim() || !formData.occurredAt) {
      toast.error('请填写标题和发生时间');
      return;
    }

    try {
      setSaving(true);
      
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('事件创建成功');
        setIsCreateDialogOpen(false);
        resetForm();
        // 创建成功后刷新事件列表
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || '创建失败');
      }
    } catch (error) {
      console.error('保存事件失败:', error);
      toast.error('保存事件失败');
    } finally {
      setSaving(false);
    }
  };

  // 文件选择 - 完全匹配管理端逻辑
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles(prev => [...prev, ...Array.from(files)]);
    }
  };

  // 上传附件 - 完全匹配管理端逻辑
  const handleUploadAttachments = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        const newAttachments = data.attachments?.map((att: { id: string; filename: string; originalName: string; url: string; size: number }) => ({
          id: att.id,
          filename: att.filename,
          originalName: att.originalName,
          url: att.url,
          size: att.size,
          isConfirmed: false
        })) || [];
        
        if (newAttachments.length > 0) {
          setUploadedAttachments(prev => [...prev, ...newAttachments]);
          setFormData(prev => ({
            ...prev,
            attachmentIds: [...prev.attachmentIds, ...newAttachments.map((a: UploadedAttachment) => a.id)]
          }));
          setSelectedFiles([]);
          toast.success('附件上传成功');
        } else {
          toast.error('没有附件上传成功');
        }
      } else {
        toast.error('附件上传失败');
      }
    } catch (error) {
      console.error('上传附件失败:', error);
      toast.error('附件上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 删除附件 - 完全匹配管理端逻辑
  const handleDeleteAttachment = async (attachmentId: string) => {
    // 在创建模式下，直接删除文件
    try {
      setDeletingAttachment(attachmentId);
      const response = await fetch(`/api/images/${attachmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUploadedAttachments(prev => prev.filter(a => a.id !== attachmentId));
        setFormData(prev => ({
          ...prev,
          attachmentIds: prev.attachmentIds.filter(id => id !== attachmentId)
        }));
        toast.success('附件删除成功');
      } else {
        toast.error('删除附件失败');
      }
    } catch (error) {
      console.error('删除附件失败:', error);
      toast.error('删除附件失败');
    } finally {
      setDeletingAttachment(null);
    }
  };

  // 移除选择的文件 - 完全匹配管理端逻辑
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  function StatusBadge({ status }: { status: EventItem['status'] }) {
    const styles: Record<string, string> = {
      planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'in-progress': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      done: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      canceled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    }
    return <Badge className={cn('capitalize', styles[status ?? 'planned'])}>{status}</Badge>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">事件中心</h1>
        <Button 
          onClick={openCreateDialog}
          className="bg-blue-600 hover:bg-blue-700"
        >
          创建事件
        </Button>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">二维表</TabsTrigger>
          <TabsTrigger value="timeline">时间轴</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>附件</TableHead>
                  <TableHead className="w-[40%]">描述</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">加载中...</TableCell>
                  </TableRow>
                )}
                {!loading && events.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">暂无事件</TableCell>
                  </TableRow>
                )}
                {events.map((e) => (
                  <TableRow key={e._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-nowrap">{format(new Date(e.occurredAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</div>
                        {e.creator && (
                          <div className="flex items-center gap-2">
                            <UserAvatar avatar={e.creator.avatar} userName={e.creator.name || e.creator.email || '用户'} size="sm" />
                            <span className="text-xs text-muted-foreground">{e.creator.name || e.creator.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => window.open(`/events/${e._id}`, '_blank')}
                        className="text-left hover:text-primary hover:underline cursor-pointer transition-colors"
                      >
                        {e.title}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{e.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.attachments && e.attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {e.attachments.map(att => (
                            <div key={att._id}>
                              {att.mimetype?.startsWith('image/') ? (
                                <ImagePreview 
                                  src={att.url} 
                                  alt={att.originalName} 
                                  size="sm"
                                  className="cursor-pointer"
                                />
                              ) : (
                                <a href={att.url} target="_blank" rel="noopener noreferrer" title={att.originalName}>
                                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] hover:bg-accent">
                                    {att.originalName}
                                  </span>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="space-y-1">
                        {e.description}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="space-y-6">
            {loading && (
              <div className="text-center py-8 text-sm text-muted-foreground">加载中...</div>
            )}
            {!loading && events.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">暂无事件</div>
            )}
            {groupedByDate.map(([date, dayEvents]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold">{format(new Date(date), 'yyyy年MM月dd日', { locale: zhCN })}</div>
                  <Badge variant="secondary">{dayEvents.length} 个事件</Badge>
                </div>
                <div className="space-y-3">
                  {dayEvents.map((e) => (
                    <div key={e._id} className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex-shrink-0">
                        <div className="w-3 h-3 rounded-full bg-primary mt-2"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => window.open(`/events/${e._id}`, '_blank')}
                            className="text-lg font-semibold hover:text-primary hover:underline cursor-pointer transition-colors"
                          >
                            {e.title}
                          </button>
                          <StatusBadge status={e.status} />
                          <Badge variant="outline" className="capitalize">{e.category}</Badge>
                        </div>
                        {e.description && (
                          <p className="text-muted-foreground mb-3">{e.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{format(new Date(e.occurredAt), 'HH:mm', { locale: zhCN })}</span>
                          {e.creator && (
                            <div className="flex items-center gap-2">
                              <UserAvatar avatar={e.creator.avatar} userName={e.creator.name || e.creator.email || '用户'} size="sm" />
                              <span>{e.creator.name || e.creator.email}</span>
                            </div>
                          )}
                        </div>
                        {e.attachments && e.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {e.attachments.map(att => (
                              <div key={att._id}>
                                {att.mimetype?.startsWith('image/') ? (
                                  <ImagePreview 
                                    src={att.url} 
                                    alt={att.originalName} 
                                    size="sm"
                                    className="cursor-pointer"
                                  />
                                ) : (
                                  <a href={att.url} target="_blank" rel="noopener noreferrer" title={att.originalName}>
                                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] hover:bg-accent">
                                      {att.originalName}
                                    </span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 创建事件对话框 - 完全匹配管理端逻辑 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleDialogClose();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建事件</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">事件标题 *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="请输入事件标题"
                />
              </div>
              <div>
                <Label htmlFor="category">分类</Label>
                <Select value={formData.category} onValueChange={(value: 'change' | 'release' | 'other') => 
                  setFormData(prev => ({ ...prev, category: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="change">变更</SelectItem>
                    <SelectItem value="release">上线</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="occurredAt">发生时间 *</Label>
              <Input
                id="occurredAt"
                type="datetime-local"
                value={formData.occurredAt}
                onChange={(e) => setFormData(prev => ({ ...prev, occurredAt: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="description">事件描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入事件描述"
                rows={4}
              />
            </div>

            {/* 附件管理 */}
            <div className="space-y-4">
              <Label>附件管理</Label>
              
              {/* 选择文件 */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleUploadAttachments}
                    disabled={selectedFiles.length === 0 || uploading}
                    className="flex items-center gap-2"
                  >
                    {uploading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    上传
                  </Button>
                </div>
                
                {uploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-sm text-muted-foreground">上传中...</p>
                  </div>
                )}
              </div>

              {/* 已选择的文件 */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>待上传文件</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="w-full h-24 bg-muted rounded border flex items-center justify-center">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-center mt-1 truncate">{file.name}</p>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeSelectedFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 已上传的附件 */}
              {uploadedAttachments.length > 0 && (
                <div className="space-y-2">
                  <Label>已上传附件</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {uploadedAttachments.map((attachment) => (
                      <div key={attachment.id} className="relative group">
                        {attachment.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <ImagePreview
                            src={attachment.url}
                            alt={attachment.originalName}
                            size="md"
                          />
                        ) : (
                          <div className="w-full h-24 bg-muted rounded border flex items-center justify-center">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <p className="text-xs text-center mt-1 truncate">{attachment.originalName}</p>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          disabled={deletingAttachment === attachment.id}
                        >
                          {deletingAttachment === attachment.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.title.trim() || !formData.occurredAt}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

