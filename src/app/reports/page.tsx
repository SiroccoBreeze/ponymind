'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText, Image as ImageIcon, FolderOpen, ZoomIn, X } from 'lucide-react';

interface ReportCategory {
  _id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      fetchReports();
    }
  }, [selectedCategory, categories]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/report-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
        // 默认选中第一个分类
        if (data.categories && data.categories.length > 0) {
          setSelectedCategory(data.categories[0]._id);
        }
      }
    } catch (error) {
      console.error('获取分类列表失败:', error);
    }
  };

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      const response = await fetch(`/api/reports?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
        // 默认选中第一个报表
        if (data.reports && data.reports.length > 0) {
          setSelectedReport(data.reports[0]);
        } else {
          setSelectedReport(null);
        }
      }
    } catch (error) {
      console.error('获取报表列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">报表中心</h1>
          <p className="text-muted-foreground">查看各类报表和统计数据</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左侧分类列表 */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  分类
                </h2>
                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <button
                        key={category._id}
                        onClick={() => setSelectedCategory(category._id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                          selectedCategory === category._id
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'hover:bg-accent border-border'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-semibold text-sm">{category.name}</span>
                        </div>
                        {category.description && (
                          <div className={`text-xs line-clamp-1 ${
                            selectedCategory === category._id
                              ? 'text-primary-foreground/80'
                              : 'text-muted-foreground'
                          }`}>
                            {category.description}
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">暂无分类</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 中间报表列表 */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  报表列表
                </h2>
                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="space-y-2 p-3 rounded-lg border">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    ))
                  ) : reports.length > 0 ? (
                    reports.map((report) => (
                      <button
                        key={report._id}
                        onClick={() => setSelectedReport(report)}
                        className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                          selectedReport?._id === report._id
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'hover:bg-accent border-border'
                        }`}
                      >
                        <div className="font-semibold mb-1 line-clamp-2">
                          {report.name}
                        </div>
                        {report.description && (
                          <div className={`text-sm line-clamp-2 ${
                            selectedReport?._id === report._id
                              ? 'text-primary-foreground/80'
                              : 'text-muted-foreground'
                          }`}>
                            {report.description}
                          </div>
                        )}
                        <div className={`text-xs mt-2 ${
                          selectedReport?._id === report._id
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}>
                          {new Date(report.createdAt).toLocaleDateString('zh-CN')}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">暂无报表</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧报表展示 */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">
                {isLoading ? (
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

                    {/* 图片展示 - 优化版 */}
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
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>请从左侧选择一个报表查看</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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

