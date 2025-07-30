'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X } from 'lucide-react';

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
  const [availableTags, setAvailableTags] = useState<ComboboxOption[]>([]);
  const [availableAuthors, setAvailableAuthors] = useState<ComboboxOption[]>([]);

  // 获取可用的标签和作者
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch('/api/posts/filters');
        if (res.ok) {
          const data = await res.json();
          // 转换标签数据为ComboboxOption格式
          const tagOptions: ComboboxOption[] = (data.tags || []).map((tag: string) => ({
            value: tag,
            label: tag,
          }));
          // 转换作者数据为ComboboxOption格式
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
    <Card className="mb-6">
      <CardContent className="p-4">
        {/* 主搜索框 */}
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索问题、文章、标签..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          
          <Button
            variant={showFilters || hasActiveFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <Filter className="h-4 w-4 mr-2" />
            筛选
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {[search, selectedTag, selectedAuthor].filter(Boolean).length}
              </Badge>
            )}
          </Button>
          
          <Button onClick={handleSearch} className="shrink-0">
            <Search className="h-4 w-4 mr-2" />
            搜索
          </Button>
        </div>

        {/* 高级筛选 */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 标签筛选 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">按标签筛选</label>
                <Combobox
                  options={availableTags}
                  value={selectedTag}
                  onValueChange={setSelectedTag}
                  placeholder="选择标签..."
                  searchPlaceholder="搜索标签..."
                  emptyMessage="未找到标签"
                  className="w-full"
                />
              </div>

              {/* 作者筛选 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">按作者筛选</label>
                <Combobox
                  options={availableAuthors}
                  value={selectedAuthor}
                  onValueChange={setSelectedAuthor}
                  placeholder="选择作者..."
                  searchPlaceholder="搜索作者..."
                  emptyMessage="未找到作者"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleClearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                清除所有筛选
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                收起筛选
              </Button>
            </div>
          </div>
        )}

        {/* 当前筛选条件显示 */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">当前筛选:</span>
              
              {search && (
                <Badge variant="secondary" className="gap-1">
                  搜索: {search}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => {
                      setSearch('');
                      handleSearch();
                    }}
                  />
                </Badge>
              )}
              
              {selectedTag && (
                <Badge variant="secondary" className="gap-1">
                  标签: {selectedTag}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => {
                      setSelectedTag('');
                      handleSearch();
                    }}
                  />
                </Badge>
              )}
              
              {selectedAuthor && (
                <Badge variant="secondary" className="gap-1">
                  作者: {availableAuthors.find(a => a.value === selectedAuthor)?.label}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => {
                      setSelectedAuthor('');
                      handleSearch();
                    }}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 