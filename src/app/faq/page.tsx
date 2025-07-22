'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ExcelFilter from '@/components/ExcelFilter';

interface FAQItem {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  views: number;
  likes: number;
  answers: number;
  createdAt: string;
  type: string;
  status: string;
  difficulty: string;
  author: {
    name: string;
    avatar?: string;
  };
}

interface FAQCategory {
  name: string;
  count: number;
  items: FAQItem[];
}

type ViewMode = 'card' | 'table';
type SortField = 'title' | 'status' | 'author' | 'views' | 'likes' | 'answers' | 'tags' | 'createdAt';

export default function FAQPage() {
  const [faqData, setFaqData] = useState<FAQCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortBy, setSortBy] = useState<SortField>('views');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [titleFilter, setTitleFilter] = useState<string>('all');
  
  // Excel筛选器状态
  const [excelFilter, setExcelFilter] = useState<{
    isOpen: boolean;
    type: 'status' | 'author' | 'tags' | 'title' | null;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    type: null,
    position: { x: 0, y: 0 }
  });

  useEffect(() => {
    const fetchFAQData = async () => {
      try {
        const response = await fetch('/api/faq');
        if (response.ok) {
          const data = await response.json();
          setFaqData(data.categories);
        }
      } catch (error) {
        console.error('获取FAQ数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFAQData();
  }, []);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const allItems = useMemo(() => {
    const items = faqData.flatMap(category => category.items);
    const uniqueItems = items.filter((item, index, self) => 
      index === self.findIndex(t => t._id === item._id)
    );
    return uniqueItems;
  }, [faqData]);

  // 获取所有唯一值用于筛选
  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(allItems.map(item => item.status))];
    return statuses;
  }, [allItems]);

  const uniqueAuthors = useMemo(() => {
    const authors = [...new Set(allItems.map(item => item.author.name))];
    return authors;
  }, [allItems]);

  const uniqueTags = useMemo(() => {
    const tags = [...new Set(allItems.flatMap(item => item.tags))];
    return tags;
  }, [allItems]);
  
  // 筛选功能
  const filteredItems = useMemo(() => {
    let filtered = allItems;

    // 搜索筛选
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchLower) ||
        item.content.toLowerCase().includes(searchLower) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // 标题筛选
    if (titleFilter !== 'all') {
      filtered = filtered.filter(item => item.title === titleFilter);
    }

    // 状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // 作者筛选
    if (authorFilter !== 'all') {
      filtered = filtered.filter(item => item.author.name === authorFilter);
    }

    // 标签筛选
    if (tagFilter !== 'all') {
      filtered = filtered.filter(item => item.tags.includes(tagFilter));
    }

    return filtered;
  }, [allItems, searchTerm, titleFilter, statusFilter, authorFilter, tagFilter]);

  // 排序功能
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'tags':
          aValue = a.tags.join(', ');
          bValue = b.tags.join(', ');
          break;
        case 'author':
          aValue = a.author.name;
          bValue = b.author.name;
          break;
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a[sortBy] as number;
          bValue = b[sortBy] as number;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredItems, sortBy, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'open': { label: '未解决', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      'answered': { label: '已解决', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      'closed': { label: '已关闭', color: 'bg-slate-50 text-slate-700 border-slate-200' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTitleFilter('all');
    setStatusFilter('all');
    setAuthorFilter('all');
    setTagFilter('all');
  };

  // Excel筛选器处理函数
  const openExcelFilter = (type: 'status' | 'author' | 'tags' | 'title', event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setExcelFilter({
      isOpen: true,
      type,
      position: { x: rect.left + rect.width / 2, y: rect.bottom + 5 }
    });
  };

  const closeExcelFilter = () => {
    setExcelFilter({ isOpen: false, type: null, position: { x: 0, y: 0 } });
  };

  const applyExcelFilter = (selectedValues: string[]) => {
    if (excelFilter.type === 'title') {
      setTitleFilter(selectedValues.length === 0 ? 'all' : selectedValues[0]);
    } else if (excelFilter.type === 'status') {
      setStatusFilter(selectedValues.length === 0 ? 'all' : selectedValues[0]);
    } else if (excelFilter.type === 'author') {
      setAuthorFilter(selectedValues.length === 0 ? 'all' : selectedValues[0]);
    } else if (excelFilter.type === 'tags') {
      setTagFilter(selectedValues.length === 0 ? 'all' : selectedValues[0]);
    }
  };

  const clearExcelFilter = () => {
    if (excelFilter.type === 'title') {
      setTitleFilter('all');
    } else if (excelFilter.type === 'status') {
      setStatusFilter('all');
    } else if (excelFilter.type === 'author') {
      setAuthorFilter('all');
    } else if (excelFilter.type === 'tags') {
      setTagFilter('all');
    }
  };

  // 获取Excel筛选器选项
  const getExcelFilterOptions = () => {
    if (excelFilter.type === 'title') {
      const uniqueTitles = [...new Set(allItems.map(item => item.title))];
      return uniqueTitles.map(title => ({
        value: title,
        label: title.length > 30 ? title.substring(0, 30) + '...' : title,
        count: allItems.filter(item => item.title === title).length
      }));
    } else if (excelFilter.type === 'status') {
      return uniqueStatuses.map(status => ({
        value: status,
        label: status === 'open' ? '未解决' : status === 'answered' ? '已解决' : '已关闭',
        count: allItems.filter(item => item.status === status).length
      }));
    } else if (excelFilter.type === 'author') {
      return uniqueAuthors.map(author => ({
        value: author,
        label: author,
        count: allItems.filter(item => item.author.name === author).length
      }));
    } else if (excelFilter.type === 'tags') {
      return uniqueTags.map(tag => ({
        value: tag,
        label: tag,
        count: allItems.filter(item => item.tags.includes(tag)).length
      }));
    }
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载FAQ内容...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 紧凑的头部区域 */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* 标题和描述 */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">常见问题解答</h1>
              <p className="text-sm text-gray-600">快速找到您需要的答案和解决方案</p>
            </div>
            
            {/* 搜索和视图切换 */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* 搜索框 */}
              <div className="relative flex-1 sm:min-w-[320px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索问题标题或关键词..."
                  className="block w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* 视图切换按钮 */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    viewMode === 'card'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                  </svg>
                  <span>卡片</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    viewMode === 'table'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h3M3 20h18" />
                  </svg>
                  <span>表格</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {sortedItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || titleFilter !== 'all' || statusFilter !== 'all' || authorFilter !== 'all' || tagFilter !== 'all' ? '没有找到相关问题' : '暂无问题'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || titleFilter !== 'all' || statusFilter !== 'all' || authorFilter !== 'all' || tagFilter !== 'all'
                ? '尝试调整筛选条件或使用其他关键词搜索'
                : '这个分类下还没有问题，欢迎提交你的问题'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/posts"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                浏览所有内容
              </Link>
              {(searchTerm || titleFilter !== 'all' || statusFilter !== 'all' || authorFilter !== 'all' || tagFilter !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200"
                >
                  清除筛选条件
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">            

            {/* 卡片视图 */}
            {viewMode === 'card' && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sortedItems.map((item) => (
                  <div key={item._id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden group">
                    <div
                      className="p-5 cursor-pointer"
                      onClick={() => toggleExpanded(item._id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-base font-semibold text-gray-900 pr-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                              {item.title}
                            </h3>
                            {getStatusBadge(item.status)}
                          </div>
                          
                          {/* 标签和统计 */}
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                            <div className="flex items-center gap-1">
                              <img
                                src={item.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author.name)}&background=3b82f6&color=fff`}
                                alt={item.author.name}
                                className="w-4 h-4 rounded-full"
                              />
                              <span>{item.author.name}</span>
                            </div>
                            <span className="flex items-center gap-1">👁 {item.views}</span>
                            <span className="flex items-center gap-1">❤️ {item.likes}</span>
                            <span className="flex items-center gap-1">💬 {item.answers}</span>
                          </div>

                          {/* 标签 */}
                          {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md border border-blue-200"
                                >
                                  {tag}
                                </span>
                              ))}
                              {item.tags.length > 3 && (
                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md">
                                  +{item.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 展开/收起图标 */}
                        <div className="flex-shrink-0 ml-3">
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                              expandedItems.has(item._id) ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* 展开的内容 */}
                    {expandedItems.has(item._id) && (
                      <div className="px-5 pb-5 border-t border-gray-100 bg-gray-50">
                        <div className="pt-4">
                          <div 
                            className="prose prose-sm max-w-none text-gray-700"
                            dangerouslySetInnerHTML={{ 
                              __html: item.content.substring(0, 300) + (item.content.length > 300 ? '...' : '')
                            }}
                          />
                          
                          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                            <div className="text-xs text-gray-500">
                              {item.content.length > 300 && '内容已截取，'}
                              查看完整内容请访问原文
                            </div>
                            <Link
                              href={`/posts/${item._id}`}
                              className="inline-flex items-center px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              查看详情
                              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 现代化表格视图 - 全屏显示 */}
            {viewMode === 'table' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                          onClick={() => handleSort('title')}
                        >
                          <div className="flex items-center space-x-2">
                            <span>问题标题</span>
                            <div className="flex items-center space-x-1">
                              {sortBy === 'title' && (
                                <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openExcelFilter('title', e);
                                }}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </th>
                        <th 
                          className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center space-x-2">
                            <span>状态</span>
                            <div className="flex items-center space-x-1">
                              {sortBy === 'status' && (
                                <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openExcelFilter('status', e);
                                }}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </th>
                        <th 
                          className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                          onClick={() => handleSort('author')}
                        >
                          <div className="flex items-center space-x-2">
                            <span>作者</span>
                            <div className="flex items-center space-x-1">
                              {sortBy === 'author' && (
                                <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openExcelFilter('author', e);
                                }}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </th>
                        <th 
                          className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                          onClick={() => handleSort('views')}
                        >
                          <div className="flex items-center space-x-2">
                            <span>浏览</span>
                            {sortBy === 'views' && (
                              <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                          onClick={() => handleSort('likes')}
                        >
                          <div className="flex items-center space-x-2">
                            <span>点赞</span>
                            {sortBy === 'likes' && (
                              <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                          onClick={() => handleSort('answers')}
                        >
                          <div className="flex items-center space-x-2">
                            <span>回答</span>
                            {sortBy === 'answers' && (
                              <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                          onClick={() => handleSort('tags')}
                        >
                          <div className="flex items-center space-x-2">
                            <span>标签</span>
                            <div className="flex items-center space-x-1">
                              {sortBy === 'tags' && (
                                <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openExcelFilter('tags', e);
                                }}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </th>
                        <th 
                          className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                          onClick={() => handleSort('createdAt')}
                        >
                          <div className="flex items-center space-x-2">
                            <span>创建时间</span>
                            {sortBy === 'createdAt' && (
                              <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedItems.map((item) => (
                        <tr key={item._id} className="hover:bg-blue-50 transition-all duration-200">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 max-w-lg truncate hover:text-blue-600 transition-colors duration-200" title={item.title}>
                              {item.title}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center">
                              <img
                                className="w-8 h-8 rounded-full mr-3 ring-2 ring-gray-100"
                                src={item.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author.name)}&background=3b82f6&color=fff`}
                                alt={item.author.name}
                              />
                              <span className="text-sm font-medium text-gray-900">{item.author.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="font-medium">{item.views}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                              </svg>
                              <span className="font-medium">{item.likes}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span className="font-medium">{item.answers}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {item.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded-md border border-blue-200 font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                              {item.tags.length > 3 && (
                                <span className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-md border border-gray-200">
                                  +{item.tags.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              href={`/posts/${item._id}`}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            >
                              查看
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Excel筛选器 */}
      <ExcelFilter
        isOpen={excelFilter.isOpen}
        onClose={closeExcelFilter}
        onApply={applyExcelFilter}
        onClear={clearExcelFilter}
        options={getExcelFilterOptions()}
        title={excelFilter.type === 'title' ? '标题' : excelFilter.type === 'status' ? '状态' : excelFilter.type === 'author' ? '作者' : '标签'}
        position={excelFilter.position}
      />
    </div>
  );
} 