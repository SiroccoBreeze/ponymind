'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function FAQPage() {
  const [faqData, setFaqData] = useState<FAQCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [sortBy, setSortBy] = useState<'views' | 'likes' | 'answers' | 'createdAt'>('views');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const allItems = faqData.flatMap(category => category.items);
  const filteredItems = searchTerm 
    ? allItems.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : (selectedCategory === 'all' 
        ? allItems 
        : faqData.find(cat => cat.name === selectedCategory)?.items || []
      );

  // 排序功能
  const sortedItems = [...filteredItems].sort((a, b) => {
    let aValue: any = a[sortBy];
    let bValue: any = b[sortBy];
    
    if (sortBy === 'createdAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (field: 'views' | 'likes' | 'answers' | 'createdAt') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'open': { label: '未解决', color: 'bg-yellow-100 text-yellow-800' },
      'answered': { label: '已解决', color: 'bg-green-100 text-green-800' },
      'closed': { label: '已关闭', color: 'bg-gray-100 text-gray-800' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载FAQ内容...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部横幅 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">常见问题解答</h1>
            <p className="text-xl text-blue-100 mb-8">
              汇集社区最常见的问题和专业解答，帮助你快速找到答案
            </p>
            
            {/* 搜索框和视图切换 */}
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索问题或关键词..."
                    className="w-full px-6 py-4 text-lg text-gray-900 bg-white rounded-full shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 pl-14"
                  />
                  <div className="absolute left-5 top-1/2 transform -translate-y-1/2">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                
                {/* 视图切换按钮 */}
                <div className="flex bg-white rounded-full shadow-lg p-1">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-full text-sm font-medium transition-all ${
                      viewMode === 'card'
                        ? 'bg-blue-500 text-white shadow-sm'
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
                    className={`flex items-center space-x-2 px-4 py-3 rounded-full text-sm font-medium transition-all ${
                      viewMode === 'table'
                        ? 'bg-blue-500 text-white shadow-sm'
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
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 左侧分类导航 */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">问题分类</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>全部问题</span>
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {allItems.length}
                    </span>
                  </div>
                </button>
                
                {faqData.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedCategory === category.name
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{category.name}</span>
                      <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {category.count}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* 快速链接 */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">快速链接</h4>
                <div className="space-y-2">
                  <Link
                    href="/posts"
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    📝 浏览所有内容
                  </Link>
                  <Link
                    href="/auth/register"
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    👤 注册账号
                  </Link>
                  <Link
                    href="/ai"
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    🤖 AI助手
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧FAQ内容 */}
          <div className="lg:w-3/4">
            {sortedItems.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchTerm ? '没有找到相关问题' : '暂无问题'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm 
                    ? '尝试使用其他关键词搜索，或浏览不同的分类'
                    : '这个分类下还没有问题，欢迎提交你的问题'
                  }
                </p>
                <Link
                  href="/posts"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  浏览所有内容
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 结果统计和排序 */}
                <div className="flex justify-between items-center mb-6">
                  <div className="text-sm text-gray-600">
                    {searchTerm && (
                      <span>搜索 &quot;{searchTerm}&quot; 找到 {sortedItems.length} 个结果</span>
                    )}
                    {!searchTerm && selectedCategory !== 'all' && (
                      <span>分类 &quot;{selectedCategory}&quot; 下有 {sortedItems.length} 个问题</span>
                    )}
                    {!searchTerm && selectedCategory === 'all' && (
                      <span>共有 {sortedItems.length} 个问题</span>
                    )}
                  </div>
                  
                  {viewMode === 'table' && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">排序:</span>
                      <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                          const [field, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                          setSortBy(field);
                          setSortOrder(order);
                        }}
                        className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="views-desc">浏览量 ↓</option>
                        <option value="views-asc">浏览量 ↑</option>
                        <option value="likes-desc">点赞数 ↓</option>
                        <option value="likes-asc">点赞数 ↑</option>
                        <option value="answers-desc">回答数 ↓</option>
                        <option value="answers-asc">回答数 ↑</option>
                        <option value="createdAt-desc">创建时间 ↓</option>
                        <option value="createdAt-asc">创建时间 ↑</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* 卡片视图 */}
                {viewMode === 'card' && (
                  <div className="space-y-4">
                    {sortedItems.map((item) => (
                      <div key={item._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                        <div
                          className="p-6 cursor-pointer"
                          onClick={() => toggleExpanded(item._id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900 pr-4">
                                  {item.title}
                                </h3>
                                {getStatusBadge(item.status)}
                              </div>
                              
                              {/* 标签和统计 */}
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={item.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author.name)}&background=3b82f6&color=fff`}
                                    alt={item.author.name}
                                    className="w-5 h-5 rounded-full"
                                  />
                                  <span>{item.author.name}</span>
                                </div>
                                <span>👁 {item.views}</span>
                                <span>❤️ {item.likes}</span>
                                <span>💬 {item.answers}</span>
                                <span>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
                              </div>

                              {/* 标签 */}
                              {item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {item.tags.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {item.tags.length > 3 && (
                                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                      +{item.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* 展开/收起图标 */}
                            <div className="flex-shrink-0 ml-4">
                              <svg
                                className={`w-6 h-6 text-gray-400 transition-transform ${
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
                          <div className="px-6 pb-6 border-t border-gray-100">
                            <div className="pt-4">
                              <div 
                                className="prose prose-sm max-w-none text-gray-700"
                                dangerouslySetInnerHTML={{ 
                                  __html: item.content.substring(0, 500) + (item.content.length > 500 ? '...' : '')
                                }}
                              />
                              
                              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <div className="text-sm text-gray-500">
                                  {item.content.length > 500 && '内容已截取，'}
                                  查看完整内容请访问原文
                                </div>
                                <Link
                                  href={`/posts/${item._id}`}
                                  className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  查看详情
                                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                {/* 表格视图 */}
                {viewMode === 'table' && (
                  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('createdAt')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>问题标题</span>
                                {sortBy === 'createdAt' && (
                                  <svg className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              状态
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              作者
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('views')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>浏览</span>
                                {sortBy === 'views' && (
                                  <svg className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('likes')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>点赞</span>
                                {sortBy === 'likes' && (
                                  <svg className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('answers')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>回答</span>
                                {sortBy === 'answers' && (
                                  <svg className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              标签
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              创建时间
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {sortedItems.map((item) => (
                            <tr key={item._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={item.title}>
                                  {item.title}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {getStatusBadge(item.status)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <img
                                    className="w-6 h-6 rounded-full mr-2"
                                    src={item.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author.name)}&background=3b82f6&color=fff`}
                                    alt={item.author.name}
                                  />
                                  <span className="text-sm text-gray-900">{item.author.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {item.views}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {item.likes}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {item.answers}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {item.tags.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {item.tags.length > 2 && (
                                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                      +{item.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                              </td>
                              <td className="px-6 py-4">
                                <Link
                                  href={`/posts/${item._id}`}
                                  className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                >
                                  查看
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
        </div>
      </div>

      {/* 底部CTA */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              没有找到你要的答案？
            </h2>
            <p className="text-gray-600 mb-8">
              我们的社区专家随时准备帮助你解决问题
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/posts"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                提出新问题
              </Link>
              <Link
                href="/ai"
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                咨询AI助手
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 