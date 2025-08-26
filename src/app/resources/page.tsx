'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Search, Filter, Database, Copy, Check, Grid, List } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/utils';

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
  createdAt: string;
}

interface ResourcesResponse {
  resources: Resource[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    categories: string[];
  };
}



export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filters, setFilters] = useState<{ categories: string[] }>({ categories: [] });
  const [pagination, setPagination] = useState({ page: 1, limit: 8, total: 0, pages: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 定义分类颜色
  const categoryColors: Record<string, string> = {
    '学习资料': 'bg-blue-100 text-blue-800',
    '软件工具': 'bg-green-100 text-green-800',
    '影视音乐': 'bg-purple-100 text-purple-800',
    '游戏娱乐': 'bg-orange-100 text-orange-800',
    '其他': 'bg-gray-100 text-gray-800'
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
          const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      ...(search && { search }),
      ...(selectedCategory && selectedCategory !== 'all' && { category: selectedCategory })
    });

      const response = await fetch(`/api/resources?${params}`);
      if (response.ok) {
        const data: ResourcesResponse = await response.json();
        setResources(data.resources);
        setPagination(data.pagination);
        setFilters(data.filters);
      }
    } catch (error) {
      console.error('获取资源失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [pagination.page, search, selectedCategory]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCopyToClipboard = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      toast.error('复制失败');
    }
  };

  const ResourceCard = ({ resource }: { resource: Resource }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-72 flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {resource.name}
            </CardTitle>
            <CardDescription className="text-sm line-clamp-2 mt-1 min-h-[1.5rem]">
              {resource.description || '暂无描述'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge className={`text-xs ${resource.category?.color || 'bg-gray-100 text-gray-800'}`}>
              {resource.category?.name || '未知分类'}
            </Badge>
          </div>
          
          {resource.accessCode && (
            <div className="flex items-center justify-between p-1.5 bg-muted/50 rounded text-sm">
              <span className="text-muted-foreground">提取码:</span>
              <div className="flex items-center space-x-2">
                <code className="font-mono text-xs">{resource.accessCode}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(resource.accessCode!, resource._id)}
                  className="h-6 w-6 p-0"
                >
                  {copiedId === resource._id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex space-x-2 mt-2">
          <Button
            onClick={() => {
              // 如果有提取码，自动复制
              if (resource.accessCode) {
                handleCopyToClipboard(resource.accessCode, resource._id);
              }
              // 打开资源链接
              window.open(resource.url, '_blank', 'noopener,noreferrer');
            }}
            className="flex-1"
            size="sm"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            <span className="text-xs">访问资源</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const ResourceListItem = ({ resource }: { resource: Resource }) => (
    <div className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-2">
          <h3 className="font-semibold truncate">{resource.name}</h3>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {resource.description}
        </p>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Badge className={`text-xs ${categoryColors[resource.category.name] || 'bg-gray-100 text-gray-800'}`}>
            {resource.category.name}
          </Badge>
          {resource.accessCode && (
            <>
              <span>•</span>
              <span>提取码: {resource.accessCode}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {resource.accessCode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopyToClipboard(resource.accessCode!, resource._id)}
            className="h-8 w-8 p-0"
          >
            {copiedId === resource._id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // 如果有提取码，自动复制
            if (resource.accessCode) {
              handleCopyToClipboard(resource.accessCode, resource._id);
            }
            // 打开资源链接
            window.open(resource.url, '_blank', 'noopener,noreferrer');
          }}
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              资源中心
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            精选各类文档资料、软件工具、技术脚本等，为您提供便捷的资源获取渠道
          </p>
        </div>

        {/* 搜索和筛选 */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索资源名称或描述..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 视图切换 */}
            <div className="flex items-center space-x-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* 筛选按钮 */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>筛选</span>
            </Button>

            {/* 清除筛选 */}
            {(search || selectedCategory !== 'all') && (
              <Button variant="ghost" onClick={clearFilters}>
                清除筛选
              </Button>
            )}
          </div>

          {/* 筛选选项 */}
          {showFilters && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">资源分类</label>
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择资源分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    {filters.categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* 资源列表 */}
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden h-72 flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-10 w-full mt-1" />
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
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
          )
        ) : resources.length === 0 ? (
          <div className="text-center py-12">
            <Database className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">暂无资源</h3>
            <p className="text-muted-foreground">没有找到符合条件的资源</p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {resources.map((resource) => (
                  <ResourceCard key={resource._id} resource={resource} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {resources.map((resource) => (
                  <ResourceListItem key={resource._id} resource={resource} />
                ))}
              </div>
            )}

            {/* 分页 */}
            {(pagination.pages > 1 || pagination.total > pagination.limit) && (
              <div className="flex justify-between items-center mt-8">
                <div className="text-sm text-muted-foreground">
                  共 {pagination.total} 条记录
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    上一页
                  </Button>
                  
                  {/* 页码显示 */}
                  <div className="flex items-center space-x-1">
                    {(() => {
                      const currentPage = pagination.page;
                      const totalPages = pagination.pages;
                      const pages: (number | string)[] = [];
                      
                      if (totalPages <= 7) {
                        // 如果总页数少于等于7页，显示所有页码
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // 如果总页数大于7页，显示智能分页
                        if (currentPage <= 4) {
                          // 当前页在前4页
                          for (let i = 1; i <= 5; i++) {
                            pages.push(i);
                          }
                          pages.push('...');
                          pages.push(totalPages);
                        } else if (currentPage >= totalPages - 3) {
                          // 当前页在后4页
                          pages.push(1);
                          pages.push('...');
                          for (let i = totalPages - 4; i <= totalPages; i++) {
                            pages.push(i);
                          }
                        } else {
                          // 当前页在中间
                          pages.push(1);
                          pages.push('...');
                          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                            pages.push(i);
                          }
                          pages.push('...');
                          pages.push(totalPages);
                        }
                      }
                      
                      return pages.map((page, index) => {
                        if (page === '...') {
                          return (
                            <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                              ...
                            </span>
                          );
                        }
                        
                        const pageNumber = page as number;
                        const isCurrentPage = pageNumber === currentPage;
                        
                        return (
                          <Button
                            key={pageNumber}
                            variant={isCurrentPage ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setPagination(prev => ({ ...prev, page: pageNumber }))}
                          >
                            {pageNumber}
                          </Button>
                        );
                      });
                    })()}
                  </div>
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
          </>
        )}
      </div>
    </div>
  );
}
