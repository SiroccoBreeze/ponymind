'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdvancedFilter, FilterConfig, FilterOption } from '@/components/ui/advanced-filter';
import { Tag, User, Hash, Calendar, ThumbsUp, Eye } from 'lucide-react';

interface NewSearchBarProps {
  onSearch?: (params: {
    search: string;
    tag: string;
    author: string;
    type?: string;
    sortBy?: string;
  }) => void;
}

export default function NewSearchBar({ onSearch }: NewSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filterValues, setFilterValues] = useState<Record<string, string | string[]>>({});
  const [availableTags, setAvailableTags] = useState<FilterOption[]>([]);
  const [availableAuthors, setAvailableAuthors] = useState<FilterOption[]>([]);

  // 从URL参数初始化筛选状态
  useEffect(() => {
    const searchParam = searchParams.get('search') || '';
    const tagParam = searchParams.get('tag') || '';
    const authorParam = searchParams.get('author') || '';
    const typeParam = searchParams.get('type') || '';
    const sortParam = searchParams.get('sortBy') || '';
    
    const newValues: Record<string, string | string[]> = {};
    if (tagParam) newValues.tag = tagParam;
    if (authorParam) newValues.author = authorParam;
    if (typeParam) newValues.type = typeParam;
    if (sortParam) newValues.sortBy = sortParam;
    
    setFilterValues(newValues);
  }, [searchParams]);

  // 获取可用的标签和作者
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch('/api/posts/filters');
        if (res.ok) {
          const data = await res.json();
          
          // 转换标签数据
          const tagOptions: FilterOption[] = (data.tags || []).map((tag: string) => ({
            value: tag,
            label: tag,
            count: data.tagCounts?.[tag] || 0,
          }));
          
          // 转换作者数据
          const authorOptions: FilterOption[] = (data.authors || []).map((author: {id: string, name: string, count?: number}) => ({
            value: author.id,
            label: author.name,
            count: author.count,
            description: `用户ID: ${author.id}`,
          }));
          
          setAvailableTags(tagOptions);
          setAvailableAuthors(authorOptions);
        }
      } catch (error) {
        console.error('获取筛选选项失败:', error);
      }
    };
    fetchFilters();
  }, []);

  // 筛选配置
  const filterConfigs: FilterConfig[] = [
    {
      key: 'tag',
      label: '标签',
      placeholder: '选择标签...',
      icon: <Tag className="h-4 w-4" />,
      options: availableTags,
      type: 'single',
      searchable: true,
    },
    {
      key: 'author',
      label: '作者',
      placeholder: '选择作者...',
      icon: <User className="h-4 w-4" />,
      options: availableAuthors,
      type: 'single',
      searchable: true,
    },
    {
      key: 'type',
      label: '类型',
      placeholder: '选择类型...',
      icon: <Hash className="h-4 w-4" />,
      options: [
        { value: 'question', label: '问题', count: 0 },
        { value: 'article', label: '文章', count: 0 },
      ],
      type: 'single',
    },
    {
      key: 'sortBy',
      label: '排序',
      placeholder: '选择排序方式...',
      icon: <ThumbsUp className="h-4 w-4" />,
      options: [
        { value: 'newest', label: '最新发布', description: '按创建时间排序' },
        { value: 'active', label: '最近活跃', description: '按最后活动时间排序' },
        { value: 'votes', label: '最多点赞', description: '按点赞数排序' },
        { value: 'views', label: '最多浏览', description: '按浏览量排序' },
      ],
      type: 'single',
    },
  ];

  const handleFilterChange = (values: Record<string, string | string[]>) => {
    setFilterValues(values);
    updateURL(values);
  };

  const handleSearch = (searchTerm: string) => {
    const params = new URLSearchParams();
    
    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    }
    
    // 添加筛选参数
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.set(key, value);
        }
      }
    });

    const queryString = params.toString();
    const newUrl = queryString ? `/?${queryString}` : '/';
    router.push(newUrl);

    // 调用父组件的回调
    if (onSearch) {
      onSearch({
        search: searchTerm.trim(),
        tag: Array.isArray(filterValues.tag) ? filterValues.tag[0] : filterValues.tag || '',
        author: Array.isArray(filterValues.author) ? filterValues.author[0] : filterValues.author || '',
        type: Array.isArray(filterValues.type) ? filterValues.type[0] : filterValues.type || '',
        sortBy: Array.isArray(filterValues.sortBy) ? filterValues.sortBy[0] : filterValues.sortBy || '',
      });
    }
  };

  const updateURL = (values: Record<string, string | string[]>) => {
    const params = new URLSearchParams();
    
    Object.entries(values).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.set(key, value);
        }
      }
    });

    const queryString = params.toString();
    const newUrl = queryString ? `/?${queryString}` : '/';
    router.push(newUrl);
  };

  return (
    <AdvancedFilter
      filters={filterConfigs}
      values={filterValues}
      onValuesChange={handleFilterChange}
      onSearch={handleSearch}
      searchPlaceholder="搜索问题、文章、标签..."
    />
  );
} 