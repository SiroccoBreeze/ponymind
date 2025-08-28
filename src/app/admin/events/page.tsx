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
  Clock,
  Tag
} from 'lucide-react';
import ImagePreview from '@/components/ui/ImagePreview';
import TagSelectionModal from '@/components/TagSelectionModal';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { getCurrentLocalTime, formatForDateTimeLocal, displayLocalTime } from '@/lib/frontend-time-utils';

interface Event {
  _id: string;
  title: string;
  description: string;
  tags: string[];
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
  tags: string[];
  occurredAt: string;
  attachmentIds: string[];
}

interface EventUpdateData extends EventFormData {
  deletedAttachmentIds?: string[];
}

interface EventFilters {
  search: string;
  tags: string;
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
    tags: 'all',
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

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    tags: [],
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
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<string[]>([]);

  // 标签选择对话框状态
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<Array<{
    _id: string;
    name: string;
    description: string;
    color: string;
    usageCount: number;
  }>>([]);

  // 获取事件列表
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filters.search && { search: filters.search }),
        ...(filters.tags !== 'all' && { tags: filters.tags }),
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
    setDeletedAttachmentIds([]); // 重置删除标记
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (event: Event) => {
    setFormData({
      title: event.title,
      description: event.description,
      tags: event.tags,
      occurredAt: formatForDateTimeLocal(event.occurredAt), // 将UTC时间转换为本地时间显示
      attachmentIds: event.attachments?.map(a => a._id) || []
    });
    setUploadedAttachments(event.attachments?.map(a => ({
      id: a._id,
      filename: a.filename,
      originalName: a.originalName,
      url: a.url,
      size: a.size,
      isConfirmed: true
    })) || []);
    setSelectedEvent(event);
    setDeletedAttachmentIds([]); // 重置删除标记
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (event: Event) => {
    // 跳转到用户端的事件详情页面
    window.open(`/events/${event._id}`, '_blank');
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
      
      // 在编辑模式下，需要处理已删除的附件
      let requestBody: EventFormData | EventUpdateData = formData;
      if (isEditDialogOpen && deletedAttachmentIds.length > 0) {
        // 将删除的附件ID也发送到后端，让后端处理删除
        requestBody = {
          ...formData,
          deletedAttachmentIds: deletedAttachmentIds
        };
      }
      
      // 处理时间：将本地时间转换为UTC时间
      const requestBodyWithUTCTime = {
        ...requestBody,
        occurredAt: requestBody.occurredAt // 后端会自动转换为UTC时间
      };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBodyWithUTCTime)
      });

      if (response.ok) {
        toast.success(isEditDialogOpen ? '事件更新成功' : '事件创建成功');
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        resetForm();
        setDeletedAttachmentIds([]); // 重置删除标记
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
      toast.error('上传附件失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    // 在编辑模式下，只标记为待删除，不立即删除文件
    if (isEditDialogOpen) {
      setDeletedAttachmentIds(prev => [...prev, attachmentId]);
      setUploadedAttachments(prev => prev.filter(a => a.id !== attachmentId));
      setFormData(prev => ({
        ...prev,
        attachmentIds: prev.attachmentIds.filter(id => id !== attachmentId)
      }));
      toast.success('附件已标记为删除');
      return;
    }

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

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatDate = (dateString: string) => {
    return displayLocalTime(dateString, 'datetime');
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const renderEventsTable = () => (
    <div className="space-y-6">
      {events.map((event) => (
        <div key={event._id} className="group relative bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 hover:shadow-xl hover:border-primary/30 dark:hover:border-primary/50 transition-all duration-300 hover:scale-[1.02]">
          {/* 事件头部信息 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors duration-300">
                    {event.title}
                  </h3>
                  {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map(tag => (
                        <Badge key={tag} className="bg-blue-100 text-blue-800 px-3 py-1 text-sm font-medium shadow-sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span>发生时间: {formatDate(event.occurredAt)}</span>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-primary/10">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-medium">操作菜单</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => openViewDialog(event)} className="cursor-pointer">
                  <Eye className="h-4 w-4 mr-3 text-blue-600" />
                  <span>查看详情</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditDialog(event)} className="cursor-pointer">
                  <Edit className="h-4 w-4 mr-3 text-green-600" />
                  <span>编辑事件</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDelete(event._id)}
                  className="text-destructive cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-3" />
                  <span>删除事件</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 事件描述 */}
          {event.description && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {truncateText(event.description)}
              </p>
            </div>
          )}

          {/* 事件元信息 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <User className="h-3 w-3" />
                </div>
                <span className="font-medium">{event.creator.name}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <Clock className="h-3 w-3" />
                </div>
                <span>创建于 {formatDate(event.createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {event.attachments && event.attachments.length > 0 && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium shadow-sm border border-orange-200 dark:border-orange-700">
                  <ImageIcon className="h-4 w-4" />
                  <span>{event.attachments.length}个附件</span>
                </div>
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
      <div className="flex items-center justify-between pb-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                事件管理
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                管理系统中的所有事件，包括创建、编辑、删除和查看详情
              </p>
            </div>
          </div>
        </div>
        <Button 
          onClick={openCreateDialog} 
          className="flex items-center gap-2 px-6 py-3 text-lg font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          新建事件
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">总事件数</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{totalEvents}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">系统中的所有事件</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">标签事件</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Badge className="h-4 w-4 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-bold">标</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {events.filter(e => e.tags && e.tags.length > 0).length}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">已添加标签的事件</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/50 dark:border-green-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">无标签事件</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <Badge className="h-4 w-4 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-bold">无</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">
              {events.filter(e => !e.tags || e.tags.length === 0).length}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">未添加标签的事件</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 border-gray-200/50 dark:border-gray-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">事件标签数</CardTitle>
            <div className="p-2 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
              <Badge className="h-4 w-4 bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 text-xs font-bold">事件</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {events.reduce((total, e) => total + (e.tags?.length || 0), 0)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">仅事件标签总数</p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <Card className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 border-slate-200/50 dark:border-slate-800/50 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            <div className="p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
              <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            筛选和搜索
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <Input
                placeholder="搜索事件标题或描述..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 bg-white/80 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600"
              />
            </div>
            <Select value={filters.tags} onValueChange={(value) => handleFilterChange('tags', value)}>
              <SelectTrigger>
                <SelectValue placeholder="标签" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部标签</SelectItem>
                <SelectItem value="has_tags">有标签</SelectItem>
                <SelectItem value="no_tags">无标签</SelectItem>
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
        <Card className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 border-slate-200/50 dark:border-slate-800/50 shadow-lg">
          <CardContent className="flex items-center justify-between py-6">
            <div className="text-sm text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="font-medium">共 {totalEvents} 个事件</span>
              <span className="mx-2">•</span>
              <span>第 {currentPage} 页，共 {totalPages} 页</span>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                上一页
              </Button>
              <div className="px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm">
                {currentPage}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                下一页
                <ChevronRight className="h-4 w-4 ml-2" />
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
                <Label>标签</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsTagModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Tag className="h-4 w-4" />
                    {formData.tags.length > 0 ? `${formData.tags.length} 个标签` : '选择标签'}
                  </Button>
                  {formData.tags.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, tags: [] }))}
                    >
                      清空
                    </Button>
                  )}
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="capitalize">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
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

             {/* 标签选择弹框 */}
       <TagSelectionModal
         isOpen={isTagModalOpen}
         onClose={() => setIsTagModalOpen(false)}
         availableTags={availableTags}
         selectedTags={formData.tags}
         onTagsChange={(tags: string[]) => setFormData(prev => ({ ...prev, tags }))}
         maxTags={5}
         title="选择标签"
         themeColor="blue"
       />
    </div>
  );
} 