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

  // 主题颜色配置
  const colorConfig = {
    blue: {
      primary: 'blue-600',
      primaryHover: 'blue-700',
      light: 'blue-50',
      lightHover: 'blue-100',
      border: 'blue-200',
      borderHover: 'blue-300',
      text: 'blue-700',
      gradient: 'from-blue-500 to-blue-600',
      gradientHover: 'from-blue-600 to-blue-700'
    },
    orange: {
      primary: 'orange-600',
      primaryHover: 'orange-700',
      light: 'orange-50',
      lightHover: 'orange-100',
      border: 'orange-200',
      borderHover: 'orange-300',
      text: 'orange-700',
      gradient: 'from-orange-500 to-orange-600',
      gradientHover: 'from-orange-600 to-orange-700'
    }
  };

  const colors = colorConfig[themeColor];

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

  // 点击外部关闭弹窗
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      // 移除动态修改body overflow的代码，避免影响页面滚动条
      // document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      // 移除动态修改body overflow的代码，避免影响页面滚动条
      // document.body.style.overflow = 'unset';
    };
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



  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isTagSelected = (tagName: string) => localSelectedTags.includes(tagName);
  const canSelectMore = localSelectedTags.length < maxTags;
  const hasChanges = JSON.stringify(localSelectedTags.sort()) !== JSON.stringify(selectedTags.sort());

  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl w-full max-h-[80vh] flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            已选择 {localSelectedTags.length}/{maxTags} 个标签
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* 搜索框 */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索标签..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
        </div>

        {/* 已选择的标签 */}
        {localSelectedTags.length > 0 && (
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center mb-3">
              <svg className="w-4 h-4 text-gray-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-gray-700">已选择的标签</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {localSelectedTags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center px-3 py-2 bg-gradient-to-r from-${colors.light} to-${colors.lightHover} text-${colors.text} rounded-lg text-sm font-medium border border-${colors.border} shadow-sm`}
                >
                  <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`ml-2 p-0.5 text-${colors.primary} hover:text-${colors.primaryHover} hover:bg-${colors.lightHover} rounded-full transition-colors`}
                    title="移除标签"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 标签列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTags.length === 0 && searchTerm ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-500">未找到匹配的标签</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredTags.map((tag) => {
                const selected = isTagSelected(tag.name);
                const disabled = !selected && !canSelectMore;
                
                return (
                  <button
                    key={tag._id}
                    onClick={() => !disabled && handleTagToggle(tag.name)}
                    disabled={disabled}
                    className={`text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                      selected
                        ? `border-${colors.border} bg-${colors.light} text-${colors.text}`
                        : disabled
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : `border-gray-200 hover:border-${colors.border} hover:bg-${colors.light} text-gray-700`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <svg className={`w-4 h-4 mr-2 ${selected ? `text-${colors.primary}` : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{tag.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${selected ? `bg-${colors.primary} text-white` : 'bg-gray-100 text-gray-500'}`}>
                          {tag.usageCount}
                        </span>
                        {selected && (
                          <svg className={`w-4 h-4 text-${colors.primary}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                    {tag.description && (
                      <p className="text-xs text-gray-500 mt-1">{tag.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={!hasChanges}>确认选择</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TagSelectionModal; 