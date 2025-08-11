'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Filter, 
  Download, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  User,
  Clock
} from 'lucide-react';
import ImagePreview from '@/components/ui/ImagePreview';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';

interface Event {
  _id: string;
  title: string;
  description: string;
  category: 'change' | 'release' | 'other';
  occurredAt: string;
  creator: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  attachments: Array<{
    _id: string;
    filename: string;
    originalName: string;
    url: string;
    mimetype: string;
    size: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface EventFormData {
  title: string;
  description: string;
  category: 'change' | 'release' | 'other';
  occurredAt: string;
  attachmentIds: string[];
}

interface EventFilters {
  search: string;
  category: string;
  status: string;
  sortBy: 'occurredAt' | 'createdAt' | 'creator';
  sortOrder: 'asc' | 'desc';
}

interface UploadedAttachment {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  isConfirmed: boolean;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EventFilters>({
    search: '',
    category: 'all',
    status: 'all',
    sortBy: 'occurredAt',
    sortOrder: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    category: 'other',
    occurredAt: '',
    attachmentIds: []
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // 附件相关状态
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<UploadedAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingAttachment, setDeletingAttachment] = useState<string | null>(null);

  const categoryLabels = {
    change: '变更',
    release: '上线',
    other: '其他'
  };

  const categoryColors = {
    change: 'bg-blue-100 text-blue-800',
    release: 'bg-green-100 text-green-800',
    other: 'bg-gray-100 text-gray-800'
  };

  // 获取事件列表
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filters.search && { search: filters.search }),
        ...(filters.category !== 'all' && { category: filters.category }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder })
      });

      const response = await fetch(`/api/admin/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
        setTotalPages(data.pagination.pages);
        setTotalEvents(data.pagination.total);
      } else {
        toast.error('获取事件列表失败');
      }
    } catch (error) {
      console.error('获取事件列表失败:', error);
      toast.error('获取事件列表失败');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (event: Event) => {
    setFormData({
      title: event.title,
      description: event.description,
      category: event.category,
      occurredAt: new Date(event.occurredAt).toISOString().slice(0, 16),
      attachmentIds: event.attachments.map(a => a._id)
    });
    setUploadedAttachments(event.attachments.map(a => ({
      id: a._id,
      filename: a.filename,
      originalName: a.originalName,
      url: a.url,
      size: a.size,
      isConfirmed: true
    })));
    setSelectedEvent(event);
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (event: Event) => {
    setSelectedEvent(event);
    setIsViewDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.occurredAt) {
      toast.error('请填写标题和发生时间');
      return;
    }

    try {
      setSaving(true);
      const url = isEditDialogOpen 
        ? `/api/admin/events/${selectedEvent?._id}` 
        : '/api/admin/events';
      
      const method = isEditDialogOpen ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(isEditDialogOpen ? '事件更新成功' : '事件创建成功');
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        resetForm();
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || '操作失败');
      }
    } catch (error) {
      console.error('保存事件失败:', error);
      toast.error('保存事件失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('确定要删除这个事件吗？此操作不可撤销。')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('事件删除成功');
        fetchEvents();
      } else {
        toast.error('删除事件失败');
      }
    } catch (error) {
      console.error('删除事件失败:', error);
      toast.error('删除事件失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleFilterChange = (key: keyof EventFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles(prev => [...prev, ...Array.from(files)]);
    }
  };

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
        const newAttachments = data.uploadedAttachments.map((att: { _id: string; filename: string; originalName: string; url: string; size: number }) => ({
          id: att._id,
          filename: att.filename,
          originalName: att.originalName,
          url: att.url,
          size: att.size,
          isConfirmed: false
        }));
        
        setUploadedAttachments(prev => [...prev, ...newAttachments]);
        setFormData(prev => ({
          ...prev,
          attachmentIds: [...prev.attachmentIds, ...newAttachments.map((a: UploadedAttachment) => a.id)]
        }));
        setSelectedFiles([]);
        toast.success('附件上传成功');
      } else {
        toast.error('附件上传失败');
      }
    } catch (error) {
      console.error('上传附件失败:', error);
      toast.error('上传附件失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
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

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: zhCN });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const renderEventsTable = () => (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event._id} className="border rounded-lg p-4 space-y-3">
          {/* 事件头部信息 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-lg">{event.title}</h3>
                  <Badge className={categoryColors[event.category]}>
                    {categoryLabels[event.category]}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(event.occurredAt)}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>操作</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => openViewDialog(event)}>
                  <Eye className="h-4 w-4 mr-2" />
                  查看详情
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditDialog(event)}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDelete(event._id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 事件描述 */}
          <div className="text-sm text-foreground">
            {truncateText(event.description)}
          </div>

          {/* 事件元信息 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-3 w-3" />
                <span>{event.creator.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3" />
                <span>创建于 {formatDate(event.createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {event.attachments.length > 0 && (
                <span>📎 {event.attachments.length}个附件</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">事件管理</h1>
          <p className="text-muted-foreground">
            管理系统中的所有事件，包括创建、编辑、删除和查看详情
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新建事件
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总事件数</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">变更事件</CardTitle>
            <Badge variant="secondary" className="h-4 w-4 bg-blue-100 text-blue-800">变</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.category === 'change').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">上线事件</CardTitle>
            <Badge variant="secondary" className="h-4 w-4 bg-green-100 text-green-800">上</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.category === 'release').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">其他事件</CardTitle>
            <Badge variant="secondary" className="h-4 w-4 bg-gray-100 text-gray-800">他</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.category === 'other').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            筛选和搜索
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索事件标题或描述..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                <SelectItem value="change">变更</SelectItem>
                <SelectItem value="release">上线</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">最近30天</SelectItem>
                <SelectItem value="inactive">30天前</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger>
                <SelectValue placeholder="排序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="occurredAt">发生时间</SelectItem>
                <SelectItem value="createdAt">创建时间</SelectItem>
                <SelectItem value="creator">创建者</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.sortOrder} onValueChange={(value) => handleFilterChange('sortOrder', value)}>
              <SelectTrigger>
                <SelectValue placeholder="顺序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">降序</SelectItem>
                <SelectItem value="asc">升序</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 事件列表 */}
      <Card>
        <CardHeader>
          <CardTitle>事件列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无事件</p>
            </div>
          ) : (
            renderEventsTable()
          )}
        </CardContent>
      </Card>

      {/* 分页 */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="text-sm text-muted-foreground">
              共 {totalEvents} 个事件，第 {currentPage} 页，共 {totalPages} 页
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 创建/编辑事件对话框 */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreateDialogOpen ? '新建事件' : '编辑事件'}
            </DialogTitle>
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
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              resetForm();
            }}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.title.trim() || !formData.occurredAt}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看事件详情对话框 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>事件详情</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">基本信息</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">事件标题</Label>
                    <p className="font-medium">{selectedEvent.title}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">分类</Label>
                    <Badge className={categoryColors[selectedEvent.category]}>
                      {categoryLabels[selectedEvent.category]}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">发生时间</Label>
                    <p>{formatDate(selectedEvent.occurredAt)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">创建时间</Label>
                    <p>{formatDate(selectedEvent.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* 创建者信息 */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <User className="h-4 w-4" />
                  <span className="font-medium">创建者</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedEvent.creator.avatar} />
                    <AvatarFallback>{selectedEvent.creator.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedEvent.creator.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedEvent.creator.email}</p>
                  </div>
                </div>
              </div>

              {/* 事件描述 */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">事件描述</span>
                </div>
                <div className="prose prose-sm max-w-none">
                  {selectedEvent.description || '暂无描述'}
                </div>
              </div>

              {/* 附件 */}
              {selectedEvent.attachments.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <ImageIcon className="h-4 w-4" />
                    <span className="font-medium">附件 ({selectedEvent.attachments.length}个)</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedEvent.attachments.map((attachment) => (
                      <div key={attachment._id} className="space-y-2">
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
                        <div className="text-center">
                          <p className="text-xs truncate">{attachment.originalName}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-1"
                            onClick={() => window.open(attachment.url, '_blank')}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            下载
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 