'use client'

import { useEffect, useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import ImagePreview from '@/components/ui/ImagePreview'
import TagSelectionModal from '@/components/TagSelectionModal'
import { EventsDataTable } from '@/components/events/EventsDataTable'
import { 
  RefreshCw,
  Upload,
  X,
  FileText,
  Tag,
} from 'lucide-react'
import CustomTimeline, { TimelineMode } from '@/components/CustomTimeline'
import { toast } from 'sonner'
import { getCurrentLocalTime, displayLocalTime } from '@/lib/frontend-time-utils'

type EventItem = {
  _id: string
  title: string
  description?: string
  tags?: string[]
  status?: 'planned' | 'in-progress' | 'done' | 'canceled'
  occurredAt: string
  attachments?: Array<{ _id: string; originalName: string; url: string; size: number; mimetype: string }>
  creator?: { _id: string; name: string; avatar?: string; email?: string }
}

interface Tag {
  _id: string;
  name: string;
  description: string;
  color: string;
  usageCount: number;
}

interface EventFormData {
  title: string;
  description: string;
  tags: string[];
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
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('day')
  
  // 根据时间轴模式格式化日期
  const formatDateForMode = (date: string, mode: TimelineMode) => {
    switch (mode) {
      case 'year':
        return displayLocalTime(date, 'date')
      case 'month':
        return displayLocalTime(date, 'datetime')
      case 'day':
      default:
        return displayLocalTime(date, 'datetime')
    }
  }
  
  // 创建/编辑事件弹框状态
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    tags: [],
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

  // 标签相关状态
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);




  // 获取可用标签
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/events/tags');
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(data.tags || []);
        }
      } catch (error) {
        console.error('获取标签失败:', error);
      }
    };
    fetchTags();
  }, []);


  const fetchEvents = useCallback(async (signal?: AbortSignal) => {
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
        toast.error('获取事件列表失败')
      }
    } finally {
      if (isMounted) {
        setLoading(false)
      }
    }
  }, [isMounted])

  useEffect(() => {
    const controller = new AbortController()
    fetchEvents(controller.signal)
    return () => {
      setIsMounted(false)
      controller.abort()
    }
  }, [fetchEvents])





  // 重置表单 - 完全匹配管理端逻辑
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      tags: [],
      occurredAt: getCurrentLocalTime(),
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
    } catch (error) {
      console.error('清理附件时出错:', error);
    }
  };

  // 打开创建对话框 - 匹配管理端逻辑
  const openCreateDialog = () => {
    setEditingEventId(null);
    resetForm();
    setIsCreateDialogOpen(true);
  };

  // 打开编辑对话框，预填充现有事件数据
  const openEditDialog = (event: EventItem) => {
    setEditingEventId(event._id);
    setFormData({
      title: event.title,
      description: event.description || '',
      tags: event.tags || [],
      occurredAt: event.occurredAt
        ? new Date(event.occurredAt).toISOString().slice(0, 16)
        : '',
      attachmentIds: (event.attachments || []).map(a => a._id),
    });
    // 把现有附件填入已上传列表，以便界面显示
    setUploadedAttachments(
      (event.attachments || []).map(a => ({
        id: a._id,
        filename: a.originalName,
        originalName: a.originalName,
        url: a.url,
        size: a.size,
        isConfirmed: true,
      }))
    );
    setIsCreateDialogOpen(true);
  };

  // 关闭对话框时的处理
  const handleDialogClose = async () => {
    // 编辑模式下不删除已有附件，只清理本次新上传的未确认附件
    if (!editingEventId && uploadedAttachments.length > 0) {
      await cleanupAttachments();
    }
    setIsCreateDialogOpen(false);
    setEditingEventId(null);
    resetForm();
  };

  // 保存事件（创建 / 编辑复用同一 Dialog）
  const handleSave = async () => {
    if (!formData.title.trim() || !formData.occurredAt) {
      toast.error('请填写标题和发生时间');
      return;
    }

    try {
      setSaving(true);

      const isEditing = !!editingEventId;
      const url = isEditing ? `/api/events/${editingEventId}` : '/api/events';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(isEditing ? '事件更新成功' : '事件创建成功');
        setIsCreateDialogOpen(false);
        setEditingEventId(null);
        resetForm();
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || (isEditing ? '更新失败' : '创建失败'));
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


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-background">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">事件中心</h1>
        <Button
          onClick={openCreateDialog}
          className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 font-semibold text-sm transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 shrink-0"
          aria-label="创建事件"
        >
          创建事件
        </Button>
      </div>

      <Tabs defaultValue="table" className="space-y-6">
        <TabsList className="rounded-lg bg-muted/50 p-1 border border-border">
          <TabsTrigger value="table" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm transition-colors duration-200">二维表</TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm transition-colors duration-200">时间轴</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-6">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <EventsDataTable events={events} loading={loading} onEdit={openEditDialog} />
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden />
                <p className="text-sm text-muted-foreground">加载中...</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto bg-card rounded-xl border border-border shadow-sm p-6">
              <CustomTimeline 
                items={events
                  .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
                  .map(event => ({
                    id: event._id,
                    title: event.title,
                    description: event.description,
                    date: formatDateForMode(event.occurredAt, timelineMode),
                    originalDate: event.occurredAt, // 传递原始日期用于分组
                    tags: event.tags,
                    creator: event.creator,
                    attachments: event.attachments,
                    onEdit: () => openEditDialog(event),
                    onClick: () => window.open(`/events/${event._id}`, '_blank')
                  }))}
                mode={timelineMode}
                onModeChange={setTimelineMode}
                showModeSelector={true}
                className="w-full"
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 创建事件对话框 - 完全匹配管理端逻辑 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleDialogClose();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-xl border-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-semibold text-foreground">{editingEventId ? '编辑事件' : '新建事件'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-foreground">事件标题 *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="请输入事件标题"
                  className="rounded-lg border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors duration-150"
                  aria-required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">标签</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsTagModalOpen(true)}
                    className="flex items-center gap-2 rounded-lg border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors duration-200 cursor-pointer"
                  >
                    <Tag className="h-4 w-4" strokeWidth={1.5} />
                    {formData.tags.length > 0 ? `${formData.tags.length} 个标签` : '选择标签'}
                  </Button>
                  {formData.tags.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, tags: [] }))}
                      className="rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
                    >
                      清空
                    </Button>
                  )}
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="capitalize rounded-full bg-muted text-muted-foreground text-xs px-2.5 py-0.5 font-medium">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="occurredAt" className="text-sm font-medium text-foreground">发生时间 *</Label>
              <Input
                id="occurredAt"
                type="datetime-local"
                value={formData.occurredAt}
                onChange={(e) => setFormData(prev => ({ ...prev, occurredAt: e.target.value }))}
                className="rounded-lg border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors duration-150"
                aria-required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-foreground">事件描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入事件描述"
                rows={4}
                className="rounded-lg border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors duration-150 resize-none"
              />
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium text-foreground">附件管理</Label>
              
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
                    type="button"
                    onClick={handleUploadAttachments}
                    disabled={selectedFiles.length === 0 || uploading}
                    className="flex items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-200 cursor-pointer"
                  >
                    {uploading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden />
                    ) : (
                      <Upload className="h-4 w-4" strokeWidth={1.5} />
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
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                          onClick={() => removeSelectedFile(index)}
                          aria-label={`移除 ${file.name}`}
                        >
                          <X className="h-3 w-3" strokeWidth={1.5} />
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
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          disabled={deletingAttachment === attachment.id}
                          aria-label={`删除附件 ${attachment.originalName}`}
                        >
                          {deletingAttachment === attachment.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" strokeWidth={1.5} aria-hidden />
                          ) : (
                            <X className="h-3 w-3" strokeWidth={1.5} />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDialogClose} className="rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer">
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.title.trim() || !formData.occurredAt} className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer transition-all duration-200">
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 标签选择弹框 */}
      <TagSelectionModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        availableTags={availableTags}
        selectedTags={formData.tags}
        onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
        maxTags={5}
        title="选择标签"
        themeColor="blue"
      />
    </div>
  )
}

