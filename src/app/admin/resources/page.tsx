'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Search, Filter, Edit, Trash2, ExternalLink, Database, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Resource {
  _id: string;
  name: string;
  description: string;
  url: string;
  category: {
    _id: string;
    name: string;
    color: string;
  };
  accessCode?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
  updatedBy?: {
    name: string;
    email: string;
  };
}

interface ResourcesResponse {
  resources: Resource[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface Category {
  _id: string;
  name: string;
  color: string;
}

export default function AdminResourcesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    category: '',
    accessCode: '',
    isActive: true,
    sortOrder: 0
  });

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/resource-categories?limit=100');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('获取分类列表失败:', error);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(selectedCategory && selectedCategory !== 'all' && { category: selectedCategory }),
        ...(isActiveFilter && isActiveFilter !== 'all' && { isActive: isActiveFilter })
      });

      const response = await fetch(`/api/admin/resources?${params}`);
      if (response.ok) {
        const data: ResourcesResponse = await response.json();
        setResources(data.resources);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('获取资源列表失败:', error);
      toast.error('获取资源列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchResources();
  }, [pagination.page, search, selectedCategory, isActiveFilter]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setIsActiveFilter('all');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      url: '',
      category: '',
      accessCode: '',
      isActive: true,
      sortOrder: 0
    });
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('资源创建成功');
        setShowCreateDialog(false);
        resetForm();
        fetchResources();
      } else {
        const error = await response.json();
        toast.error(error.error || '创建失败');
      }
    } catch (error) {
      console.error('创建资源失败:', error);
      toast.error('创建资源失败');
    }
  };

  const handleEdit = async () => {
    if (!editingResource) return;

    try {
      const response = await fetch(`/api/admin/resources/${editingResource._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('资源更新成功');
        setEditingResource(null);
        resetForm();
        fetchResources();
      } else {
        const error = await response.json();
        toast.error(error.error || '更新失败');
      }
    } catch (error) {
      console.error('更新资源失败:', error);
      toast.error('更新资源失败');
    }
  };

  const handleDelete = async () => {
    if (!deletingResource) return;

    try {
      const response = await fetch(`/api/admin/resources/${deletingResource._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('资源删除成功');
        setDeletingResource(null);
        fetchResources();
      } else {
        const error = await response.json();
        toast.error(error.error || '删除失败');
      }
    } catch (error) {
      console.error('删除资源失败:', error);
      toast.error('删除资源失败');
    }
  };

  const openEditDialog = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      description: resource.description,
      url: resource.url,
      category: resource.category._id,
      accessCode: resource.accessCode || '',
      isActive: resource.isActive,
      sortOrder: resource.sortOrder
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
      toast.error('复制失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">资源管理</h1>
          <p className="text-muted-foreground">管理平台网盘资源信息</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>添加资源</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>添加新资源</DialogTitle>
              <DialogDescription>填写资源信息，支持各类网盘链接</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">资源名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入资源名称"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">资源分类 *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择资源分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded ${category.color}`}></div>
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">排序</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="url">资源链接 *</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessCode">提取码</Label>
                <Input
                  id="accessCode"
                  value={formData.accessCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, accessCode: e.target.value }))}
                  placeholder="可选"
                />
              </div>
              <div className="space-y-2 flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">启用状态</Label>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="description">资源描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="描述资源内容..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                取消
              </Button>
              <Button onClick={handleCreate}>创建资源</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <CardTitle>搜索和筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索资源名称或描述..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>筛选</span>
            </Button>
            {(search || selectedCategory !== 'all' || isActiveFilter !== 'all') && (
              <Button variant="ghost" onClick={clearFilters}>
                清除筛选
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">资源分类</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded ${category.color}`}></div>
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">状态</Label>
                <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="true">启用</SelectItem>
                    <SelectItem value="false">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 资源列表 */}
      <Card>
        <CardHeader>
          <CardTitle>资源列表</CardTitle>
          <CardDescription>
            共 {pagination.total} 个资源，第 {pagination.page} 页，共 {pagination.pages} 页
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">暂无资源</h3>
              <p className="text-muted-foreground">没有找到符合条件的资源</p>
            </div>
          ) : (
            <div className="space-y-4">
              {resources.map((resource) => (
                <div key={resource._id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold truncate">{resource.name}</h3>
                      <Badge variant={resource.isActive ? "default" : "secondary"}>
                        {resource.isActive ? '启用' : '禁用'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {resource.description}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Badge className={`text-xs ${resource.category?.color || 'bg-gray-100 text-gray-800'}`}>
                        {resource.category?.name || '未知分类'}
                      </Badge>
                      <span>•</span>
                      <span>排序: {resource.sortOrder}</span>
                      <span>•</span>
                      <span>创建者: {resource.createdBy.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {resource.accessCode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(resource.accessCode!, resource._id)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedId === resource._id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(resource)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingResource(resource)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除资源 "{resource.name}" 吗？此操作无法撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeletingResource(null)}>
                            取消
                          </AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {pagination.pages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  上一页
                </Button>
                <span className="text-sm text-muted-foreground">
                  第 {pagination.page} 页，共 {pagination.pages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={!!editingResource} onOpenChange={(open) => !open && setEditingResource(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑资源</DialogTitle>
            <DialogDescription>修改资源信息</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">资源名称 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="输入资源名称"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">资源分类 *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="选择资源分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded ${category.color}`}></div>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sortOrder">排序</Label>
              <Input
                id="edit-sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-url">资源链接 *</Label>
              <Input
                id="edit-url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-accessCode">提取码</Label>
              <Input
                id="edit-accessCode"
                value={formData.accessCode}
                onChange={(e) => setFormData(prev => ({ ...prev, accessCode: e.target.value }))}
                placeholder="可选"
              />
            </div>
            <div className="space-y-2 flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="edit-isActive">启用状态</Label>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-description">资源描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="描述资源内容..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingResource(null)}>
              取消
            </Button>
            <Button onClick={handleEdit}>保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
