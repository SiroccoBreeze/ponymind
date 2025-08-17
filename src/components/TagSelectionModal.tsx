'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Tag, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import pinyin from 'pinyin';

interface Tag {
  _id: string;
  name: string;
  description: string;
  color: string;
  usageCount: number;
}

interface TagSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableTags: Tag[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  title?: string;
  themeColor?: 'blue' | 'orange';
}

const TagSelectionModal: React.FC<TagSelectionModalProps> = ({
  isOpen,
  onClose,
  availableTags,
  selectedTags,
  onTagsChange,
  maxTags = 5,
  title = "选择标签",
  themeColor = 'blue'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelectedTags, setLocalSelectedTags] = useState<string[]>(selectedTags);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalSelectedTags(selectedTags);
  }, [selectedTags]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };

  const handleConfirm = () => {
    onTagsChange(localSelectedTags);
    handleClose();
  };

  const handleTagToggle = (tagName: string) => {
    if (localSelectedTags.includes(tagName)) {
      setLocalSelectedTags(prev => prev.filter(tag => tag !== tagName));
    } else if (localSelectedTags.length < maxTags) {
      setLocalSelectedTags(prev => [...prev, tagName]);
    }
  };

  // 生成标签的拼音和首字母
  const getTagPinyin = (text: string) => {
    const pinyinResult = pinyin(text, { style: pinyin.STYLE_NORMAL });
    const fullPinyin = pinyinResult.flat().join('');
    const firstLetters = pinyinResult.map(item => item[0]?.[0] || '').join('');
    return { fullPinyin, firstLetters };
  };

  const filteredTags = availableTags.filter(tag => {
    const searchLower = searchTerm.toLowerCase();
    const nameLower = tag.name.toLowerCase();
    const descLower = tag.description?.toLowerCase() || '';
    
    // 直接文本匹配
    if (nameLower.includes(searchLower) || descLower.includes(searchLower)) {
      return true;
    }
    
    // 中文首拼匹配
    if (searchTerm.length > 0) {
      const { fullPinyin, firstLetters } = getTagPinyin(tag.name);
      const descPinyin = tag.description ? getTagPinyin(tag.description) : { fullPinyin: '', firstLetters: '' };
      
      // 匹配全拼
      if (fullPinyin.toLowerCase().includes(searchLower) || 
          descPinyin.fullPinyin.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // 匹配首字母
      if (firstLetters.toLowerCase().includes(searchLower) || 
          descPinyin.firstLetters.toLowerCase().includes(searchLower)) {
        return true;
      }
    }
    
    return false;
  });

  const isTagSelected = (tagName: string) => localSelectedTags.includes(tagName);
  const canSelectMore = localSelectedTags.length < maxTags;
  const hasChanges = JSON.stringify(localSelectedTags.sort()) !== JSON.stringify(selectedTags.sort());

  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="w-[95vw] max-w-6xl max-h-[85vh] flex flex-col p-0">
        <AlertDialogHeader className="px-6 py-4 border-b">
          <AlertDialogTitle className="text-xl font-semibold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            已选择 {localSelectedTags.length}/{maxTags} 个标签
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* 搜索框 */}
        <div className="px-6 py-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                         <Input
               ref={searchInputRef}
               type="text"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder="搜索标签名称、描述或拼音..."
               className="pl-10 h-10"
             />
          </div>
        </div>

        {/* 已选择的标签 */}
        {localSelectedTags.length > 0 && (
          <div className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">已选择的标签</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {localSelectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-transparent"
                    onClick={() => handleTagToggle(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 标签列表 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredTags.length === 0 && searchTerm ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">未找到匹配的标签</p>
            </div>
          ) : (
                                      <div className="flex flex-wrap gap-3">
               {filteredTags.map((tag) => {
                 const selected = isTagSelected(tag.name);
                 const disabled = !selected && !canSelectMore;
                 
                 return (
                   <Button
                     key={tag._id}
                     variant="outline"
                     onClick={() => !disabled && handleTagToggle(tag.name)}
                     disabled={disabled}
                     className={cn(
                       "h-auto p-2.5 justify-start text-left min-w-fit max-w-full",
                       selected && "border-primary bg-primary/5 text-primary",
                       disabled && "opacity-50 cursor-not-allowed"
                     )}
                     style={{ width: 'fit-content' }}
                   >
                     <div className="flex items-center gap-1.5">
                       <div className={cn(
                         "h-1.5 w-1.5 rounded-full flex-shrink-0",
                         selected ? "bg-primary" : "bg-muted-foreground/30"
                       )} />
                       <div className="flex items-center gap-1.5">
                         <span className="font-medium text-xs whitespace-nowrap">{tag.name}</span>
                         <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                           {tag.usageCount}
                         </Badge>
                       </div>
                       {selected && (
                         <Check className="h-3.5 w-3.5 text-primary ml-1" />
                       )}
                     </div>
                   </Button>
                 );
               })}
             </div>
          )}
        </div>

        {/* 底部按钮 */}
        <AlertDialogFooter className="px-6 py-4 border-t">
          <AlertDialogCancel onClick={handleClose}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={!hasChanges}>
            确认选择
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TagSelectionModal; 