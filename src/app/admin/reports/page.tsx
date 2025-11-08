'use client';

import { useState, useEffect, useRef } from 'react';
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
  FolderOpen,
  FileText,
  Sparkles,
  ZoomIn
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ReportCategory | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ReportCategory | null>(null);
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);

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
        setCategories(data.categories || []);
        // 如果没有选中分类，默认选中第一个
        if (!selectedCategory && data.categories && data.categories.length > 0) {
          setSelectedCategory(data.categories[0]._id);
        }
      }
    } catch (error) {
      console.error('获取分类列表失败:', error);
    }
  };

  // 获取报表列表
  const fetchReports = async () => {
    if (!selectedCategory) {
      setReports([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reports?category=${selectedCategory}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('获取报表列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [selectedCategory]);

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
        if (selectedCategory === deletingCategory._id) {
          setSelectedCategory(null);
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

  const handleCreateReport = () => {
    if (!selectedCategory) {
      toast.error('请先选择分类');
      return;
    }
    resetReportForm();
    setShowReportDialog(true);
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

    if (!selectedCategory) {
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
      submitFormData.append('category', selectedCategory);
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
        fetchReports();
        if (editingReport) {
          setSelectedReport(null);
        }
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

    try {
      const response = await fetch(`/api/admin/reports/${deletingReport._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('报表删除成功');
        if (selectedReport?._id === deletingReport._id) {
          setSelectedReport(null);
        }
        fetchReports();
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

  const selectedCategoryData = categories.find(c => c._id === selectedCategory);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            报表管理
          </h1>
          <p className="text-muted-foreground mt-1">管理报表分类和内容</p>
        </div>
        <Button onClick={handleCreateCategory} className="gap-2 shadow-lg">
          <FolderPlus className="w-4 h-4" />
          新建分类
        </Button>
      </div>

      {/* 主内容区 - 三栏布局 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：分类列表 */}
        <div className="w-64 border-r bg-muted/30 overflow-y-auto">
          <div className="p-4 space-y-2">
            {categories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无分类</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={handleCreateCategory}
                >
                  创建第一个分类
                </Button>
              </div>
            ) : (
              categories.map((category) => (
                <div
                  key={category._id}
                  onClick={() => {
                    setSelectedCategory(category._id);
                    setSelectedReport(null);
                  }}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group relative overflow-hidden cursor-pointer",
                    selectedCategory === category._id
                      ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-md"
                      style={{ backgroundColor: category.color }}
                    >
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{category.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {reports.filter(r => r.category._id === category._id).length} 个报表
                      </p>
                    </div>
                  </div>
                  {category.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {category.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
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
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingCategory(category);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 中间：报表列表 */}
        <div className="w-80 border-r bg-background overflow-y-auto">
          <div className="p-4 border-b bg-gradient-to-r from-muted/50 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">
                {selectedCategoryData ? selectedCategoryData.name : '选择分类'}
              </h2>
              {selectedCategory && (
                <Button
                  size="sm"
                  onClick={handleCreateReport}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  新建报表
                </Button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-3">
            {!selectedCategory ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">请先选择一个分类</p>
              </div>
            ) : loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-lg" />
              ))
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm mb-4">该分类下暂无报表</p>
                <Button size="sm" onClick={handleCreateReport}>
                  创建第一个报表
                </Button>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report._id}
                  onClick={() => handleSelectReport(report)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group relative overflow-hidden cursor-pointer",
                    selectedReport?._id === report._id
                      ? "border-primary bg-primary/10 shadow-lg"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1 truncate">{report.name}</h3>
                      {report.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {report.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={report.isActive ? 'default' : 'secondary'} className="text-xs">
                          {report.isActive ? '已启用' : '已禁用'}
                        </Badge>
                        {report.images && report.images.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {report.images.length} 张图片
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditReport(report);
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingReport(report);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧：报表详情和图片管理 */}
        <div className="flex-1 bg-muted/20 overflow-y-auto">
          {selectedReport ? (
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">{selectedReport.name}</h2>
                </div>
                {selectedReport.description && (
                  <p className="text-muted-foreground mb-4">{selectedReport.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <Badge variant={selectedReport.isActive ? 'default' : 'secondary'}>
                    {selectedReport.isActive ? '已启用' : '已禁用'}
                  </Badge>
                  <span>创建时间: {new Date(selectedReport.createdAt).toLocaleString('zh-CN')}</span>
                </div>
              </div>

              {/* 图片展示区域 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">报表图片</h3>
                  {selectedReport.images && selectedReport.images.length > 0 && (
                    <Badge variant="secondary" className="text-sm">
                      共 {selectedReport.images.length} 张
                    </Badge>
                  )}
                </div>

                {selectedReport.images && selectedReport.images.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedReport.images.map((image, index) => (
                      <div
                        key={index}
                        className="group relative rounded-xl overflow-hidden border-2 border-border hover:border-primary/50 transition-all duration-200 bg-card cursor-pointer"
                        onClick={() => setPreviewImage({ url: image.url, alt: image.originalName })}
                      >
                        <div className="aspect-video bg-muted relative">
                          <img
                            src={image.url}
                            alt={image.originalName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex items-center gap-2 text-white">
                              <ZoomIn className="w-6 h-6" />
                              <span className="text-sm font-medium">点击预览</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50">
                          <p className="text-xs font-medium truncate">{image.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {(image.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground mb-4">该报表暂无图片</p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      上传图片
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div>
                <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">选择一个报表查看详情</p>
                <p className="text-sm">在左侧选择分类，然后选择报表进行管理</p>
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
            <img
              src={previewImage.url}
              alt={previewImage.alt}
              className="rounded-lg transition-opacity duration-300 max-w-[90vw] max-h-[90vh] object-contain"
            />
            {previewImage.alt && (
              <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center">
                <span className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded max-w-md">
                  {previewImage.alt}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
