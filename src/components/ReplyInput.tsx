'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ReplyInputProps {
  onSubmit: (content: string, images: string[]) => void;
  onCancel: () => void;
  onUploadImages: (files: FileList) => Promise<string[]>;
  isSubmitting?: boolean;
  isUploading?: boolean;
  placeholder?: string;
  uploadedImages?: string[];
  onRemoveImage?: (index: number) => void;
}

// 表情数据
const EMOJI_CATEGORIES = {
  '常用': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
  '手势': ['👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '👂', '👃', '👀', '👁️', '👅', '👄', '💋'],
  '物品': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
};

const ReplyInput: React.FC<ReplyInputProps> = ({
  onSubmit,
  onCancel,
  onUploadImages,
  isSubmitting = false,
  isUploading = false,
  placeholder = "写下你的回复...",
  uploadedImages = [],
  onRemoveImage
}) => {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState('常用');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  // 自动聚焦
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // 点击外部关闭表情选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    onSubmit(content.trim(), uploadedImages);
    setContent('');
  };

  const handleEmojiClick = (emoji: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + emoji.length;
          textareaRef.current.selectionEnd = start + emoji.length;
          textareaRef.current.focus();
        }
      }, 0);
    }
    setShowEmojiPicker(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      await onUploadImages(files);
    } catch (error) {
      console.error('上传失败:', error);
    }
    
    e.target.value = '';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <form onSubmit={handleSubmit}>
        {/* 图片预览区域 */}
        {uploadedImages.length > 0 && (
          <div className="p-3 pb-0">
            <div className="flex flex-wrap gap-2">
              {uploadedImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`预览图片 ${index + 1}`}
                    className="w-12 h-12 object-cover rounded border border-gray-200"
                  />
                  {onRemoveImage && (
                    <button
                      type="button"
                      onClick={() => onRemoveImage(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 文本输入区域 */}
        <div className="p-3">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="w-full resize-none border-none outline-none text-gray-900 placeholder-gray-500 text-sm leading-relaxed min-h-[2.5rem] max-h-[8rem] overflow-y-auto"
            style={{ fontSize: '14px' }}
            rows={2}
          />
        </div>

        {/* 工具栏 */}
        <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between">
          {/* 左侧工具按钮 */}
          <div className="flex items-center space-x-2">
            {/* 表情按钮 */}
            <div className="relative" ref={emojiPickerRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 transition-colors"
                title="表情"
              >
                <span className="text-sm">😊</span>
              </button>

              {/* 表情选择器 */}
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  {/* 表情分类标签 */}
                  <div className="flex border-b border-gray-200">
                    {Object.keys(EMOJI_CATEGORIES).map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedEmojiCategory(category)}
                        className={`flex-1 py-2 px-2 text-xs font-medium transition-colors ${
                          selectedEmojiCategory === category
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  {/* 表情列表 */}
                  <div className="p-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-6 gap-1">
                      {EMOJI_CATEGORIES[selectedEmojiCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleEmojiClick(emoji)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-sm"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 图片按钮 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="添加图片"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" />
              </svg>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* 上传状态提示 */}
            {isUploading && (
              <div className="flex items-center text-xs text-gray-500">
                <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                上传中...
              </div>
            )}
          </div>

          {/* 右侧按钮区域 */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim() || isUploading}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                content.trim() && !isSubmitting && !isUploading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? '回复中...' : '回复'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ReplyInput; 