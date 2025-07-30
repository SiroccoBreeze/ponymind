'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EnhancedCombobox, type EnhancedComboboxOption } from '@/components/ui/enhanced-combobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Search, Filter, X, Tag, User, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizedSearchBarProps {
  onSearch?: (params: {
    search: string;
    tag: string;
    author: string;
  }) => void;
  initialFilters?: {
    search: string;
    tag: string;
    author: string;
  };
}

export default function OptimizedSearchBar({ onSearch, initialFilters }: OptimizedSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(initialFilters?.search || searchParams.get('search') || '');
  const [selectedTag, setSelectedTag] = useState(initialFilters?.tag || searchParams.get('tag') || '');
  const [selectedAuthor, setSelectedAuthor] = useState(initialFilters?.author || searchParams.get('author') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<EnhancedComboboxOption[]>([]);
  const [availableAuthors, setAvailableAuthors] = useState<EnhancedComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取可用的标签和作者
  const fetchFilters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/posts/filters');
      if (res.ok) {
        const data = await res.json();
        
        // 转换标签数据为EnhancedComboboxOption格式
        const tagOptions: EnhancedComboboxOption[] = (data.tags || []).map((tag: string, index: number) => ({
          value: tag,
          label: tag,
          category: index < 10 ? '热门标签' : '其他标签',
        }));
        
        // 转换作者数据为EnhancedComboboxOption格式
        const authorOptions: EnhancedComboboxOption[] = (data.authors || []).map((author: {
          id: string, 
          name: string, 
          postCount?: number,
          email?: string
        }) => ({
          value: author.id,
          label: author.name,
          count: author.postCount,
          description: author.email,
          category: (author.postCount || 0) >= 5 ? '活跃作者' : '其他作者',
        }));
        
        setAvailableTags(tagOptions);
        setAvailableAuthors(authorOptions);
      }
    } catch (error) {
      console.error('获取筛选选项失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  // 监听外部筛选状态变化
  useEffect(() => {
    if (initialFilters) {
      setSearch(initialFilters.search);
      setSelectedTag(initialFilters.tag);
      setSelectedAuthor(initialFilters.author);
    }
  }, [initialFilters]);

  // 监听URL参数变化
  useEffect(() => {
    const searchParam = searchParams.get('search') || '';
    const tagParam = searchParams.get('tag') || '';
    const authorParam = searchParams.get('author') || '';
    
    if (searchParam !== search) setSearch(searchParam);
    if (tagParam !== selectedTag) setSelectedTag(tagParam);
    if (authorParam !== selectedAuthor) setSelectedAuthor(authorParam);
  }, [searchParams]);

  const handleSearch = useCallback(() => {
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
  }, [search, selectedTag, selectedAuthor, router, onSearch]);

  const handleClearFilters = useCallback(() => {
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
  }, [router, onSearch]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const hasActiveFilters = search || selectedTag || selectedAuthor;

  return (
    <Card className="mb-6 shadow-sm border-0 bg-white/50 backdrop-blur-sm">
      <CardContent className="p-4">
        {/* 主搜索区域 */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索内容、标签或作者..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 h-11 border-0 bg-background/80 backdrop-blur-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          <Button 
            onClick={handleSearch}
            className="h-11 px-6 bg-primary hover:bg-primary/90 shadow-sm"
          >
            <Search className="h-4 w-4 mr-2" />
            搜索
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-11 px-4 border-0 bg-background/80 backdrop-blur-sm hover:bg-accent/80",
              showFilters && "bg-accent text-accent-foreground"
            )}
          >
            <Filter className="h-4 w-4 mr-2" />
            筛选
            {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>
        </div>

        {/* 高级筛选区域 */}
        {showFilters && (
          <>
            <Separator className="my-4" />
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 标签筛选 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    按标签筛选
                  </label>
                  <EnhancedCombobox
                    type="tag"
                    options={availableTags}
                    value={selectedTag}
                    onValueChange={setSelectedTag}
                    placeholder="选择标签..."
                    searchPlaceholder="搜索标签..."
                    emptyMessage="未找到标签"
                    className="w-full"
                    grouped={true}
                    showCount={false}
                    maxHeight={250}
                  />
                </div>

                {/* 作者筛选 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    按作者筛选
                  </label>
                  <EnhancedCombobox
                    type="author"
                    options={availableAuthors}
                    value={selectedAuthor}
                    onValueChange={setSelectedAuthor}
                    placeholder="选择作者..."
                    searchPlaceholder="搜索作者..."
                    emptyMessage="未找到作者"
                    className="w-full"
                    grouped={true}
                    showCount={true}
                    maxHeight={250}
                  />
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center justify-between pt-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-muted-foreground hover:text-foreground"
                  disabled={!hasActiveFilters}
                >
                  <X className="h-4 w-4 mr-1" />
                  清除所有筛选
                </Button>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowFilters(false)}
                  >
                    收起筛选
                  </Button>
                  <Button 
                    onClick={handleSearch}
                    size="sm"
                    className="px-4"
                  >
                    应用筛选
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 当前筛选条件显示 */}
        {hasActiveFilters && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">当前筛选条件:</span>
              <div className="flex flex-wrap items-center gap-2">
                {search && (
                  <Badge variant="secondary" className="gap-1 py-1 px-2">
                    <Search className="h-3 w-3" />
                    {search}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" 
                      onClick={() => {
                        setSearch('');
                        setTimeout(handleSearch, 0);
                      }}
                    />
                  </Badge>
                )}
                
                {selectedTag && (
                  <Badge variant="secondary" className="gap-1 py-1 px-2">
                    <Tag className="h-3 w-3" />
                    {selectedTag}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" 
                      onClick={() => {
                        setSelectedTag('');
                        setTimeout(handleSearch, 0);
                      }}
                    />
                  </Badge>
                )}
                
                {selectedAuthor && (
                  <Badge variant="secondary" className="gap-1 py-1 px-2">
                    <User className="h-3 w-3" />
                    {availableAuthors.find(a => a.value === selectedAuthor)?.label || selectedAuthor}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" 
                      onClick={() => {
                        setSelectedAuthor('');
                        setTimeout(handleSearch, 0);
                      }}
                    />
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}