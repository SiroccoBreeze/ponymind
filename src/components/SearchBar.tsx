'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SearchBarProps {
  onSearch?: (params: {
    search: string;
    tag: string;
    author: string;
  }) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');
  const [selectedAuthor, setSelectedAuthor] = useState(searchParams.get('author') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableAuthors, setAvailableAuthors] = useState<{id: string, name: string}[]>([]);

  // 获取可用的标签和作者
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch('/api/posts/filters');
        if (res.ok) {
          const data = await res.json();
          setAvailableTags(data.tags || []);
          setAvailableAuthors(data.authors || []);
        }
      } catch (error) {
        console.error('获取筛选选项失败:', error);
      }
    };
    fetchFilters();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    if (search.trim()) {
      params.set('search', search.trim());
    }
    if (selectedTag) {
      params.set('tag', selectedTag);
    }
    if (selectedAuthor) {
      params.set('author', selectedAuthor);
    }

    const queryString = params.toString();
    const newUrl = queryString ? `/?${queryString}` : '/';
    router.push(newUrl);

    // 调用父组件的回调
    if (onSearch) {
      onSearch({
        search: search.trim(),
        tag: selectedTag,
        author: selectedAuthor
      });
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedTag('');
    setSelectedAuthor('');
    router.push('/');
    
    if (onSearch) {
      onSearch({
        search: '',
        tag: '',
        author: ''
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const hasActiveFilters = search || selectedTag || selectedAuthor;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      {/* 主搜索框 */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="搜索问题、文章、标签..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={handleKeyPress}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 border rounded-lg transition-colors duration-200 ${
            showFilters || hasActiveFilters
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707v4.586a1 1 0 01-.293.707l-2 2A1 1 0 019 21v-6.586a1 1 0 00-.293-.707L2.293 7.293A1 1 0 012 6.586V4z" />
          </svg>
          筛选
        </button>
        
        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          搜索
        </button>
      </div>

      {/* 高级筛选 */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 标签筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                按标签筛选
              </label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">所有标签</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            {/* 作者筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                按作者筛选
              </label>
              <select
                value={selectedAuthor}
                onChange={(e) => setSelectedAuthor(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">所有作者</option>
                {availableAuthors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              清除所有筛选
            </button>
            
            <button
              onClick={() => setShowFilters(false)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              收起筛选
            </button>
          </div>
        </div>
      )}

      {/* 当前筛选条件显示 */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">当前筛选:</span>
            
            {search && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                搜索: {search}
                <button
                  onClick={() => {
                    setSearch('');
                    handleSearch();
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            
            {selectedTag && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                标签: {selectedTag}
                <button
                  onClick={() => {
                    setSelectedTag('');
                    handleSearch();
                  }}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}
            
            {selectedAuthor && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                作者: {availableAuthors.find(a => a.id === selectedAuthor)?.name}
                <button
                  onClick={() => {
                    setSelectedAuthor('');
                    handleSearch();
                  }}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 