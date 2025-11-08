'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Image as ImageIcon, 
  ZoomIn, 
  X, 
  ChevronRight,
  ChevronDown,
  Search
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface ReportCategory {
  _id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  sortOrder?: number;
}

interface Report {
  _id: string;
  name: string;
  description?: string;
  category: ReportCategory;
  images: Array<{
    url: string;
    filename: string;
    originalName: string;
    size: number;
    mimetype: string;
  }>;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
}

export default function ReportsPage() {
  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryReports, setCategoryReports] = useState<Record<string, Report[]>>({});
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const initializedRef = useRef(false);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/report-categories');
      if (response.ok) {
        const data = await response.json();
        // 确保分类按 sortOrder 排序
        const sortedCategories = (data.categories || []).sort((a: ReportCategory, b: ReportCategory) => {
          if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
            return a.sortOrder - b.sortOrder;
          }
          return 0;
        });
        setCategories(sortedCategories);
      }
    } catch (error) {
      console.error('获取分类列表失败:', error);
    }
  };

  const fetchReportsForCategory = useCallback(async (categoryId: string, isFirstCategory: boolean = false) => {
    // 设置该分类为加载中
    setLoadingCategories(prev => {
      const newSet = new Set(prev);
      newSet.add(categoryId);
      return newSet;
    });

    try {
      const response = await fetch(`/api/reports?category=${categoryId}`);
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
        
        // 如果是第一个分类且没有选中的报表，自动选中第一个报表
        if (isFirstCategory && reports.length > 0) {
          setSelectedReport(prev => {
            if (!prev) {
              return reports[0];
            }
            return prev;
          });
        }
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
  }, []);

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
    expandedCategories.forEach(categoryId => {
      // 检查是否已有数据或正在加载
      const hasData = categoryReports[categoryId] !== undefined;
      const isLoading = loadingCategories.has(categoryId);
      
      if (!hasData && !isLoading) {
        const isFirstCategory = categories.length > 0 && categories[0]._id === categoryId;
        fetchReportsForCategory(categoryId, isFirstCategory);
      }
    });
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
          const isFirstCategory = categories.length > 0 && categories[0]._id === categoryId;
          fetchReportsForCategory(categoryId, isFirstCategory);
        }
      }
      return newSet;
    });
  };

  return (
    <div className="fixed inset-0 pt-16 overflow-hidden">
      <SidebarProvider>
        <div className="flex h-[calc(100vh-4rem)] w-full">
          {/* 左侧菜单栏 */}
          <Sidebar collapsible="icon" className="w-64" style={{ top: '4rem', height: 'calc(100vh - 4rem)' }}>
          <SidebarHeader className="border-b px-4 py-3 flex gap-2">
            <SidebarTrigger />
            {/* <span className="font-semibold text-sm">报表分类</span> */}
          </SidebarHeader>
          <SidebarContent>
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
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {categories.length === 0 ? (
                    <SidebarMenuItem>
                      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        暂无分类
                      </div>
                    </SidebarMenuItem>
                  ) : (
                    categories.map((category) => {
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
                        <SidebarMenuItem key={category._id}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SidebarMenuButton
                                  onClick={() => toggleCategory(category._id)}
                                  className="h-8 px-2"
                                >
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    {shouldExpand ? (
                                      <ChevronDown className="w-3 h-3 shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 shrink-0" />
                                    )}
                                    <div
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: category.color }}
                                    />
                                    <span className="truncate text-xs">{category.name}</span>
                                    {hasReports && (
                                      <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1">
                                        {searchQuery.trim() ? filteredReports.length : allReports.length}
                                      </Badge>
                                    )}
                                  </div>
                                </SidebarMenuButton>
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
                            <SidebarMenuSub>
                              {loadingCategories.has(category._id) ? (
                                Array.from({ length: 3 }).map((_, index) => (
                                  <SidebarMenuSubItem key={index}>
                                    <Skeleton className="h-6 w-full" />
                                  </SidebarMenuSubItem>
                                ))
                              ) : hasReports ? (
                                filteredReports.map((report) => {
                                  const isSelected = selectedReport?._id === report._id;
                                  return (
                                    <SidebarMenuSubItem key={report._id}>
                                      <SidebarMenuSubButton
                                        onClick={() => setSelectedReport(report)}
                                        isActive={isSelected}
                                        size="sm"
                                        className={cn(
                                          isSelected && "bg-primary text-primary-foreground font-semibold shadow-md border-l-2 border-primary",
                                          isSelected && "hover:bg-primary/90 dark:hover:bg-primary/80",
                                          !isSelected && "hover:bg-accent hover:text-accent-foreground"
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
                                          "truncate",
                                          isSelected && "font-semibold"
                                        )}>{report.name}</span>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  );
                                })
                              ) : searchQuery.trim() ? (
                                <SidebarMenuSubItem>
                                  <div className="px-2 py-1 text-[10px] text-muted-foreground">
                                    未找到匹配的报表
                                  </div>
                                </SidebarMenuSubItem>
                              ) : (
                                <SidebarMenuSubItem>
                                  <div className="px-2 py-1 text-[10px] text-muted-foreground">
                                    暂无报表
                                  </div>
                                </SidebarMenuSubItem>
                              )}
                            </SidebarMenuSub>
                          )}
                        </SidebarMenuItem>
                      );
                    }).filter(Boolean)
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* 右侧内容区 */}
        <SidebarInset className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6">
            {loadingCategories.size > 0 && !selectedReport ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : selectedReport ? (
              <div className="space-y-6">
                {/* 报表标题和描述 */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
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
                  {selectedReport.description && (
                    <p className="text-muted-foreground mb-4">{selectedReport.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
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
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent && !parent.querySelector('.error-placeholder')) {
                                  const errorDiv = document.createElement('div');
                                  errorDiv.className = 'error-placeholder flex items-center justify-center min-h-[400px] bg-muted rounded-lg';
                                  errorDiv.innerHTML = `
                                    <div class="text-center text-muted-foreground">
                                      <svg class="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <p class="text-sm font-medium">图片加载失败</p>
                                      <p class="text-xs mt-1 opacity-70">${image.originalName}</p>
                                    </div>
                                  `;
                                  parent.appendChild(errorDiv);
                                }
                              }}
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
                      <p className="text-sm">请等待管理员上传图片</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div>
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">请选择一个报表查看</p>
                  <p className="text-sm">从左侧菜单选择分类和报表</p>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>

      {/* 图片预览对话框 - 使用 Portal 渲染到 body 最顶层 */}
      {previewImage && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setPreviewImage(null)}
          style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}
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
        </div>,
        document.body
      )}
      </SidebarProvider>
    </div>
  );
}

