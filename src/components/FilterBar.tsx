'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tag, User, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  onSearch?: (params: {
    search: string;
    tag: string;
    author: string;
  }) => void;
}

interface ComboboxOption {
  value: string;
  label: string;
  count?: number;
}

export default function FilterBar({ onSearch }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');
  const [selectedAuthor, setSelectedAuthor] = useState(searchParams.get('author') || '');
  const [availableTags, setAvailableTags] = useState<ComboboxOption[]>([]);
  const [availableAuthors, setAvailableAuthors] = useState<ComboboxOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 从URL参数初始化状态
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setSelectedTag(searchParams.get('tag') || '');
    setSelectedAuthor(searchParams.get('author') || '');
  }, [searchParams]);

  // 获取可用的标签和作者
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/posts/filters');
        if (res.ok) {
          const data = await res.json();
          
          // 转换标签数据
          const tagOptions: ComboboxOption[] = (data.tags || []).map((tag: string) => ({
            value: tag,
            label: tag,
            count: data.tagCounts?.[tag] || 0,
          }));
          
          // 转换作者数据
          const authorOptions: ComboboxOption[] = (data.authors || []).map((author: {id: string, name: string, count?: number}) => ({
            value: author.id,
            label: author.name,
            count: author.count,
          }));
          
          setAvailableTags(tagOptions);
          setAvailableAuthors(authorOptions);
        }
      } catch (error) {
        console.error('获取筛选选项失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFilters();
  }, []);

  const updateURL = (newSearch: string, newTag: string, newAuthor: string) => {
    const params = new URLSearchParams();
    
    if (newSearch.trim()) {
      params.set('search', newSearch.trim());
    }
    if (newTag) {
      params.set('tag', newTag);
    }
    if (newAuthor) {
      params.set('author', newAuthor);
    }

    const queryString = params.toString();
    const newUrl = queryString ? `/?${queryString}` : '/';
    router.push(newUrl);
  };

  const handleSearch = () => {
    updateURL(search, selectedTag, selectedAuthor);
    
    // 调用父组件的回调
    if (onSearch) {
      onSearch({
        search: search.trim(),
        tag: selectedTag,
        author: selectedAuthor,
      });
    }
  };

  const handleTagChange = (value: string) => {
    setSelectedTag(value);
    updateURL(search, value, selectedAuthor);
    
    if (onSearch) {
      onSearch({
        search: search.trim(),
        tag: value,
        author: selectedAuthor,
      });
    }
  };

  const handleAuthorChange = (value: string) => {
    setSelectedAuthor(value);
    updateURL(search, selectedTag, value);
    
    if (onSearch) {
      onSearch({
        search: search.trim(),
        tag: selectedTag,
        author: value,
      });
    }
  };

  const handleClearAll = () => {
    setSearch('');
    setSelectedTag('');
    setSelectedAuthor('');
    router.push('/');
    
    if (onSearch) {
      onSearch({
        search: '',
        tag: '',
        author: '',
      });
    }
  };

  const hasActiveFilters = search.trim() || selectedTag || selectedAuthor;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* 搜索输入框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索问题、文章、标签..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 pr-4 h-12"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setSearch('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* 筛选器区域 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 标签筛选 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Tag className="h-4 w-4" />
                按标签筛选
              </label>
              <Combobox
                options={availableTags}
                value={selectedTag}
                onValueChange={handleTagChange}
                placeholder="选择标签..."
                searchPlaceholder="搜索标签..."
                emptyMessage="未找到标签"
                className="w-full"
                disabled={isLoading}
              />
            </div>

            {/* 作者筛选 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                按作者筛选
              </label>
              <Combobox
                options={availableAuthors}
                value={selectedAuthor}
                onValueChange={handleAuthorChange}
                placeholder="选择作者..."
                searchPlaceholder="搜索作者..."
                emptyMessage="未找到作者"
                className="w-full"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 操作按钮 */}
          {hasActiveFilters && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>当前筛选:</span>
                  {search.trim() && (
                    <Badge variant="secondary" className="text-xs">
                      搜索: {search.trim()}
                    </Badge>
                  )}
                  {selectedTag && (
                    <Badge variant="secondary" className="text-xs">
                      标签: {selectedTag}
                    </Badge>
                  )}
                  {selectedAuthor && (
                    <Badge variant="secondary" className="text-xs">
                      作者: {availableAuthors.find(a => a.value === selectedAuthor)?.label || selectedAuthor}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-2" />
                  清除筛选
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 