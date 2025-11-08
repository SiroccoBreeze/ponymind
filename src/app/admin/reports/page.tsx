'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Upload, 
  Image as ImageIcon, 
  FolderPlus,
  FileText,
  ZoomIn,
  ChevronRight,
  ChevronDown,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
// 不使用 Sidebar 组件，因为 AdminLayout 已经有 Sidebar
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReportImage {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
}

interface Report {
  _id: string;
  name: string;
  description: string;
  images: ReportImage[];
  category: {
    _id: string;
    name: string;
    color: string;
    icon: string;
  };
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
}

interface ReportCategory {
  _id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
}

export default function AdminReportsPage() {
  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryReports, setCategoryReports] = useState<Record<string, Report[]>>({});
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set());
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ReportCategory | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ReportCategory | null>(null);
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const initializedRef = useRef(false);

  // 分类表单
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: 'BarChart3',
    isActive: true,
    sortOrder: 0
  });

  // 报表表单
  const [reportForm, setReportForm] = useState({
    name: '',
    description: '',
    isActive: true,
    sortOrder: 0
  });

  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<ReportImage[]>([]);

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/report-categories');
      if (response.ok) {
        const data = await response.json();
        // 确保分类按 sortOrder 排序
        const sortedCategories = (data.categories || []).sort((a: ReportCategory, b: ReportCategory) => {
          const aOrder = a.sortOrder ?? 0;
          const bOrder = b.sortOrder ?? 0;
          return aOrder - bOrder;
        });
        setCategories(sortedCategories);
      }
    } catch (error) {
      console.error('获取分类列表失败:', error);
    }
  };

  // 获取指定分类的报表
  const fetchReportsForCategory = useCallback(async (categoryId: string) => {
    // 如果已经有数据，不重复获取
    if (categoryReports[categoryId]) {
      return;
    }

    // 设置该分类为加载中
    setLoadingCategories(prev => {
      const newSet = new Set(prev);
      newSet.add(categoryId);
      return newSet;
    });

    try {
      const response = await fetch(`/api/admin/reports?category=${categoryId}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        const reports = data.reports || [];
        
        setCategoryReports(prev => {
          // 如果已经有数据，不重复设置
          if (prev[categoryId]) {
            return prev;
          }
          return {
            ...prev,
            [categoryId]: reports
          };
        });
      }
    } catch (error) {
      console.error('获取报表列表失败:', error);
    } finally {
      setLoadingCategories(prev => {
        const newSet = new Set(prev);
        newSet.delete(categoryId);
        return newSet;
      });
    }
  }, [categoryReports]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !initializedRef.current) {
      // 初始化时展开第一个分类
      const firstCategoryId = categories[0]._id;
      const newSet = new Set([firstCategoryId]);
      setExpandedCategories(newSet);
      initializedRef.current = true;
    }
  }, [categories]);

  useEffect(() => {
    // 为所有已展开但还没有数据的分类获取报表
    if (expandedCategories.size > 0) {
      expandedCategories.forEach(categoryId => {
        // 检查是否已有数据或正在加载
        const hasData = categoryReports[categoryId] !== undefined;
        const isLoading = loadingCategories.has(categoryId);
        
        if (!hasData && !isLoading) {
          fetchReportsForCategory(categoryId);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedCategories]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
        // 如果该分类还没有数据且不在加载中，立即获取
        const hasData = categoryReports[categoryId] !== undefined;
        const isLoading = loadingCategories.has(categoryId);
        if (!hasData && !isLoading) {
          fetchReportsForCategory(categoryId);
        }
      }
      return newSet;
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      color: '#3b82f6',
      icon: 'BarChart3',
      isActive: true,
      sortOrder: 0
    });
    setEditingCategory(null);
  };

  const resetReportForm = () => {
    setReportForm({
      name: '',
      description: '',
      isActive: true,
      sortOrder: 0
    });
    setUploadedImages([]);
    setExistingImages([]);
    setEditingReport(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 处理对话框关闭，如果取消则恢复原始图片
  const handleDialogClose = (open: boolean) => {
    if (!open && editingReport) {
      // 如果取消编辑，恢复原始图片列表
      setExistingImages([...(editingReport.images || [])]);
      setUploadedImages([]);
    }
    setShowReportDialog(open);
    if (!open) {
      resetReportForm();
    }
  };

  const handleCreateCategory = () => {
    resetCategoryForm();
    setShowCategoryDialog(true);
  };

  const handleEditCategory = (category: ReportCategory) => {
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon,
      isActive: category.isActive,
      sortOrder: category.sortOrder
    });
    setEditingCategory(category);
    setShowCategoryDialog(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }

    try {
      const url = editingCategory
        ? `/api/admin/report-categories/${editingCategory._id}`
        : '/api/admin/report-categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      });

      if (response.ok) {
        toast.success(editingCategory ? '分类更新成功' : '分类创建成功');
        setShowCategoryDialog(false);
        resetCategoryForm();
        fetchCategories();
        // 清除该分类的报表缓存，以便重新加载
        if (editingCategory) {
          setCategoryReports(prev => {
            const updated = { ...prev };
            delete updated[editingCategory._id];
            return updated;
          });
        }
      } else {
        const data = await response.json();
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error('保存分类失败:', error);
      toast.error('操作失败');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    try {
      const response = await fetch(`/api/admin/report-categories/${deletingCategory._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('分类删除成功');
        setCategoryReports(prev => {
          const updated = { ...prev };
          delete updated[deletingCategory._id];
          return updated;
        });
        setExpandedCategories(prev => {
          const newSet = new Set(prev);
          newSet.delete(deletingCategory._id);
          return newSet;
        });
        if (selectedReport?.category._id === deletingCategory._id) {
          setSelectedReport(null);
        }
        fetchCategories();
        setDeletingCategory(null);
      } else {
        const data = await response.json();
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除分类失败:', error);
      toast.error('删除失败');
    }
  };

  const handleCreateReport = (categoryId: string) => {
    resetReportForm();
    setShowReportDialog(true);
    // 临时存储选中的分类ID
    (window as any).__tempSelectedCategory = categoryId;
  };

  const handleEditReport = (report: Report) => {
    setReportForm({
      name: report.name,
      description: report.description || '',
      isActive: report.isActive,
      sortOrder: report.sortOrder
    });
    // 创建图片数组的副本，避免直接修改原数组
    setExistingImages([...(report.images || [])]);
    setUploadedImages([]);
    setEditingReport(report);
    setShowReportDialog(true);
    // 临时存储选中的分类ID
    (window as any).__tempSelectedCategory = report.category._id;
  };

  const handleSelectReport = async (report: Report) => {
    setSelectedReport(report);
    // 获取报表详情
    try {
      const response = await fetch(`/api/admin/reports/${report._id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedReport(data);
      }
    } catch (error) {
      console.error('获取报表详情失败:', error);
    }
  };

  const handleSaveReport = async () => {
    if (!reportForm.name.trim()) {
      toast.error('请输入报表名称');
      return;
    }

    const categoryId = (window as any).__tempSelectedCategory || (editingReport?.category._id);
    if (!categoryId) {
      toast.error('请选择分类');
      return;
    }

    if (editingReport) {
      if (existingImages.length === 0 && uploadedImages.length === 0) {
        toast.error('请至少上传一张图片');
        return;
      }
    } else {
      if (uploadedImages.length === 0) {
        toast.error('请至少上传一张图片');
        return;
      }
    }

    try {
      const submitFormData = new FormData();
      submitFormData.append('name', reportForm.name);
      submitFormData.append('description', reportForm.description);
      submitFormData.append('category', categoryId);
      submitFormData.append('isActive', reportForm.isActive.toString());
      submitFormData.append('sortOrder', reportForm.sortOrder.toString());

      if (editingReport) {
        submitFormData.append('existingImages', JSON.stringify(existingImages));
      }

      uploadedImages.forEach((file) => {
        submitFormData.append('images', file);
      });

      const url = editingReport
        ? `/api/admin/reports/${editingReport._id}`
        : '/api/admin/reports';
      const method = editingReport ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: submitFormData
      });

      if (response.ok) {
        toast.success(editingReport ? '报表更新成功' : '报表创建成功');
        setShowReportDialog(false);
        resetReportForm();
        // 清除该分类的报表缓存，以便重新加载
        setCategoryReports(prev => {
          const updated = { ...prev };
          delete updated[categoryId];
          return updated;
        });
        // 如果该分类已展开，重新获取报表
        if (expandedCategories.has(categoryId)) {
          fetchReportsForCategory(categoryId);
        }
        if (editingReport) {
          setSelectedReport(null);
        }
        delete (window as any).__tempSelectedCategory;
      } else {
        const data = await response.json();
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error('保存报表失败:', error);
      toast.error('操作失败');
    }
  };

  const handleDeleteReport = async () => {
    if (!deletingReport) return;

    const categoryId = deletingReport.category._id;

    try {
      const response = await fetch(`/api/admin/reports/${deletingReport._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('报表删除成功');
        if (selectedReport?._id === deletingReport._id) {
          setSelectedReport(null);
        }
        // 清除该分类的报表缓存，以便重新加载
        setCategoryReports(prev => {
          const updated = { ...prev };
          delete updated[categoryId];
          return updated;
        });
        // 如果该分类已展开，重新获取报表
        if (expandedCategories.has(categoryId)) {
          fetchReportsForCategory(categoryId);
        }
        setDeletingReport(null);
      } else {
        const data = await response.json();
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除报表失败:', error);
      toast.error('删除失败');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error(`文件 ${file.name} 格式不支持`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`文件 ${file.name} 大小超过 10MB`);
        return false;
      }
      return true;
    });

    if (editingReport) {
      setUploadedImages(prev => [...prev, ...validFiles]);
    } else {
      setUploadedImages(validFiles);
    }
  };

  const removeImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setUploadedImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      {/* 左侧菜单栏 - 不使用 SidebarProvider，因为已经在 AdminLayout 中 */}
      <div className="w-64 border-r bg-sidebar overflow-y-auto flex-shrink-0">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">报表分类</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCreateCategory}
            className="h-7 w-7 p-0"
          >
            <FolderPlus className="w-4 h-4" />
          </Button>
        </div>
        {/* 搜索框 */}
        <div className="px-3 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索报表..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
        <div className="p-2">
          {categories.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              暂无分类
            </div>
          ) : (
            <div className="space-y-1">
              {categories.map((category) => {
                const isExpanded = expandedCategories.has(category._id);
                const allReports = categoryReports[category._id] || [];
                // 根据搜索关键词过滤报表
                const filteredReports = searchQuery.trim()
                  ? allReports.filter(report => 
                      report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (report.description && report.description.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                  : allReports;
                const hasReports = filteredReports.length > 0;
                // 如果有搜索关键词且有匹配的报表，自动展开分类
                const shouldExpand = isExpanded || (searchQuery.trim() && hasReports);

                // 如果有搜索关键词但没有匹配的报表，不显示该分类
                if (searchQuery.trim() && !hasReports) {
                  return null;
                }

                return (
                  <div key={category._id} className="group">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <button
                              onClick={() => toggleCategory(category._id)}
                              className="w-full flex items-center gap-1.5 h-8 px-2 rounded-md text-xs hover:bg-sidebar-accent transition-colors"
                            >
                              {shouldExpand ? (
                                <ChevronDown className="w-3 h-3 shrink-0" />
                              ) : (
                                <ChevronRight className="w-3 h-3 shrink-0" />
                              )}
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: category.color }}
                              />
                                    <span className="truncate flex-1 text-left">{category.name}</span>
                                    {hasReports && (
                                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                        {searchQuery.trim() ? filteredReports.length : allReports.length}
                                      </Badge>
                                    )}
                            </button>
                            {/* 分类编辑和删除按钮 - 悬浮显示 */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditCategory(category);
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingCategory(category);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </TooltipTrigger>
                        {category.description && (
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="text-xs">{category.description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                          
                    {/* 报表列表 - 可收缩 */}
                    {shouldExpand && (
                      <div className="ml-4 mt-1 space-y-0.5">
                        {loadingCategories.has(category._id) ? (
                          Array.from({ length: 3 }).map((_, index) => (
                            <div key={index} className="px-2 py-1">
                              <Skeleton className="h-6 w-full" />
                            </div>
                          ))
                        ) : hasReports ? (
                          <>
                            {filteredReports.map((report) => {
                              const isSelected = selectedReport?._id === report._id;
                              return (
                                <div key={report._id} className="group/report relative">
                                  <button
                                    onClick={() => handleSelectReport(report)}
                                    className={cn(
                                      "w-full flex items-center gap-2 h-7 px-2 rounded-md text-xs transition-colors",
                                      isSelected 
                                        ? "bg-primary text-primary-foreground font-semibold shadow-sm border-l-2 border-primary"
                                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                    )}
                                    style={isSelected ? {
                                      backgroundColor: 'hsl(var(--primary))',
                                      color: 'hsl(var(--primary-foreground))'
                                    } : undefined}
                                  >
                                    <FileText className={cn(
                                      "w-3 h-3 shrink-0",
                                      isSelected ? "text-primary-foreground" : "text-muted-foreground"
                                    )} />
                                    <span className={cn(
                                      "truncate flex-1 text-left",
                                      isSelected && "font-semibold"
                                    )}>{report.name}</span>
                                  </button>
                                  {/* 管理按钮 - 悬浮显示 */}
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/report:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditReport(report);
                                      }}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingReport(report);
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                            {/* 新建报表按钮 */}
                            <button
                              onClick={() => handleCreateReport(category._id)}
                              className="w-full flex items-center gap-2 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                            >
                              <Plus className="w-3 h-3 shrink-0" />
                              <span className="truncate">新建报表</span>
                            </button>
                          </>
                        ) : searchQuery.trim() ? (
                          <div className="px-2 py-1 text-[10px] text-muted-foreground">
                            未找到匹配的报表
                          </div>
                        ) : (
                          <div className="px-2 py-1 text-[10px] text-muted-foreground flex items-center justify-between">
                            <span>暂无报表</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => handleCreateReport(category._id)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }).filter(Boolean)}
            </div>
          )}
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 overflow-auto bg-background">
        <div className="h-full p-6">
          {selectedReport ? (
            <div className="space-y-6">
              {/* 报表标题和描述 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{selectedReport.name}</h2>
                    {selectedReport.category && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1.5"
                        style={{ borderColor: selectedReport.category.color }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: selectedReport.category.color }}
                        />
                        {selectedReport.category.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditReport(selectedReport)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingReport(selectedReport)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除
                    </Button>
                  </div>
                </div>
                {selectedReport.description && (
                  <p className="text-muted-foreground mb-4">{selectedReport.description}</p>
                )}
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <Badge variant={selectedReport.isActive ? 'default' : 'secondary'}>
                    {selectedReport.isActive ? '已启用' : '已禁用'}
                  </Badge>
                  <span>创建时间: {new Date(selectedReport.createdAt).toLocaleString('zh-CN')}</span>
                  {selectedReport.createdBy && (
                    <span>创建者: {selectedReport.createdBy.name}</span>
                  )}
                </div>
              </div>

              {/* 图片展示 */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">报表图片</h3>
                  {selectedReport.images && selectedReport.images.length > 0 && (
                    <Badge variant="secondary" className="text-sm">
                      共 {selectedReport.images.length} 张
                    </Badge>
                  )}
                </div>
                {selectedReport.images && selectedReport.images.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {selectedReport.images.map((image, index) => (
                      <div 
                        key={index} 
                        className="group relative rounded-xl overflow-hidden border-2 border-border hover:border-primary/30 transition-all duration-300 bg-card shadow-sm hover:shadow-lg cursor-pointer"
                        onClick={() => setPreviewImage({ url: image.url, alt: `${selectedReport.name} - 图片 ${index + 1}` })}
                      >
                        <div className="relative w-full bg-gradient-to-br from-muted/50 to-muted">
                          <img
                            src={image.url}
                            alt={`${selectedReport.name} - 图片 ${index + 1}`}
                            className="w-full h-auto object-contain max-h-[70vh] mx-auto block"
                            loading="lazy"
                          />
                          {/* 图片序号标识 */}
                          <div className="absolute top-4 left-4 bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                            图片 {index + 1} / {selectedReport.images.length}
                          </div>
                          {/* 悬浮提示 */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex items-center gap-2 text-white">
                              <ZoomIn className="w-6 h-6" />
                              <span className="text-sm font-medium">点击预览</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-muted/80 to-muted/50 border-t">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{image.originalName}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {(image.size / 1024).toFixed(2)} KB · {image.mimetype}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/30">
                    <ImageIcon className="w-20 h-20 mx-auto mb-4 opacity-30" />
                    <p className="text-base font-medium mb-1">该报表暂无图片</p>
                    <p className="text-sm">请编辑报表上传图片</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div>
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">选择一个报表查看详情</p>
                <p className="text-sm">从左侧菜单选择分类和报表进行管理</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 分类对话框 */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? '编辑分类' : '新建分类'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? '修改分类信息' : '创建一个新的报表分类'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>分类名称 *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="请输入分类名称"
              />
            </div>
            <div className="space-y-2">
              <Label>分类描述</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入分类描述（可选）"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>颜色</Label>
                <Input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>排序</Label>
                <Input
                  type="number"
                  value={categoryForm.sortOrder}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={categoryForm.isActive}
                onCheckedChange={(checked) => setCategoryForm(prev => ({ ...prev, isActive: checked }))}
              />
              <Label>启用分类</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCategoryDialog(false);
              resetCategoryForm();
            }}>
              取消
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 报表对话框 */}
      <Dialog open={showReportDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReport ? '编辑报表' : '新建报表'}</DialogTitle>
            <DialogDescription>
              {editingReport ? '修改报表信息' : '创建一个新的报表'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveReport(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>报表名称 *</Label>
              <Input
                value={reportForm.name}
                onChange={(e) => setReportForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="请输入报表名称"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>报表描述</Label>
              <Textarea
                value={reportForm.description}
                onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入报表描述（可选）"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>图片 *</Label>
              <div className="space-y-4">
                {editingReport && existingImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">现有图片:</p>
                    <div className="grid grid-cols-2 gap-4">
                      {existingImages.map((image, index) => (
                        <div key={index} className="relative border rounded-lg overflow-hidden">
                          <img
                            src={image.url}
                            alt={image.originalName}
                            className="w-full h-32 object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeImage(index, true)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <div className="p-2 bg-muted">
                            <p className="text-xs truncate">{image.originalName}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {uploadedImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">新上传的图片:</p>
                    <div className="grid grid-cols-2 gap-4">
                      {uploadedImages.map((file, index) => (
                        <div key={index} className="relative border rounded-lg overflow-hidden">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-32 object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeImage(index, false)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <div className="p-2 bg-muted">
                            <p className="text-xs truncate">{file.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {editingReport ? '添加更多图片' : '上传图片'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={reportForm.isActive}
                  onCheckedChange={(checked) => setReportForm(prev => ({ ...prev, isActive: checked }))}
                />
                <Label>启用报表</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Label>排序:</Label>
                <Input
                  type="number"
                  value={reportForm.sortOrder}
                  onChange={(e) => setReportForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  className="w-20"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                handleDialogClose(false);
              }}>
                取消
              </Button>
              <Button type="submit">
                {editingReport ? '更新' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除分类</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除分类 &quot;{deletingCategory?.name}&quot; 吗？此操作无法撤销。如果该分类下有报表，将无法删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingReport} onOpenChange={(open) => !open && setDeletingReport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除报表</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除报表 &quot;{deletingReport?.name}&quot; 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReport}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 图片预览对话框 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-8 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2 transition-colors"
            title="关闭"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {previewImage && (
              <>
                <img
                  src={previewImage.url}
                  alt={previewImage.alt || '预览图片'}
                  className="rounded-lg transition-opacity duration-300 max-w-[90vw] max-h-[90vh] object-contain"
                />
                {previewImage.alt && (
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center">
                    <span className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded max-w-md">
                      {previewImage.alt}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
