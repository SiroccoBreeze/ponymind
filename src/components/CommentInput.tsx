'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { cacheImage, removeCachedImage, CachedImage, validateImage, uploadCachedImages } from '@/lib/image-cache';

interface CommentInputProps {
  onSubmit: (content: string, images: string[]) => void;
  onCancel?: () => void;
  placeholder?: string;
  isSubmitting?: boolean;
  postId?: string; // 添加帖子ID参数
}

// 表情数据
const EMOJI_CATEGORIES = {
  '常用': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
  '手势': ['👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸'],
  '物品': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧️', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
};

const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  onCancel,
  placeholder = "写下你的想法...",
  isSubmitting = false,
  postId,
}) => {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState('常用');
  const [cachedImages, setCachedImages] = useState<CachedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

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

  // 组件卸载时清理缓存的图片
  useEffect(() => {
    return () => {
      cachedImages.forEach(img => {
        removeCachedImage(img.id);
      });
    };
  }, [cachedImages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    try {
      // 上传缓存的图片
      const imageUrls = cachedImages.length > 0 ? await uploadCachedImages(cachedImages, postId) : [];
      
      // 提交评论
      await onSubmit(content.trim(), imageUrls);
      
      // 清理缓存的图片
      cachedImages.forEach(img => {
        removeCachedImage(img.id);
      });
      
      // 重置表单
      setContent('');
      setCachedImages([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent);
      
      // 设置光标位置
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
    
    const fileArray = Array.from(files);
    
    // 检查文件数量限制
    if (cachedImages.length + fileArray.length > 50) {
      toast.error('一次最多只能上传50张图片');
      e.target.value = '';
      return;
    }
    
    setIsUploading(true);
    
    try {
      const newCachedImages: CachedImage[] = [];
      
      for (const file of fileArray) {
        const validation = validateImage(file);
        if (!validation.valid) {
          toast.error(validation.error);
          continue;
        }
        
        const cachedImage = cacheImage(file);
        newCachedImages.push(cachedImage);
      }
      
      setCachedImages(prev => [...prev, ...newCachedImages]);
    } catch (error) {
      console.error('缓存图片失败:', error);
    } finally {
      setIsUploading(false);
      // 清空文件输入
      e.target.value = '';
    }
  };

  if (!session?.user) {
    return (
      <div className="bg-muted rounded-xl p-4 text-center">
        <p className="text-muted-foreground mb-3">登录后可以发表评论</p>
        <a
          href="/auth/signin"
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
        >
          立即登录
        </a>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border-2 border-border hover:border-primary/50 focus-within:border-primary transition-all duration-200 shadow-sm">
      <form onSubmit={handleSubmit}>
        {/* 图片预览区域 */}
        {cachedImages.length > 0 && (
          <div className="p-4 pb-0">
            <div className="flex flex-wrap gap-2">
              {cachedImages.map((cachedImage, index) => (
                <div key={cachedImage.id} className="relative group">
                  <img
                    src={cachedImage.previewUrl}
                    alt={`预览图片 ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      removeCachedImage(cachedImage.id);
                      setCachedImages(prev => prev.filter(img => img.id !== cachedImage.id));
                    }}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 文本输入区域 */}
        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="w-full resize-none border-none outline-none text-foreground placeholder-muted-foreground text-base leading-relaxed min-h-[3rem] max-h-[8rem] overflow-y-auto bg-transparent"
            style={{ fontSize: '16px' }}
          />
        </div>

        {/* 工具栏 */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between">
          {/* 左侧工具按钮 */}
          <div className="flex items-center space-x-3">
            {/* 表情按钮 */}
            <div className="relative" ref={emojiPickerRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-accent transition-colors"
                title="表情"
              >
                <span className="text-lg">😊</span>
              </button>

              {/* 表情选择器 */}
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 w-80 bg-popover rounded-lg shadow-lg border border-border z-50">
                  {/* 表情分类标签 */}
                  <div className="flex border-b border-border">
                    {Object.keys(EMOJI_CATEGORIES).map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedEmojiCategory(category)}
                        className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                          selectedEmojiCategory === category
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  {/* 表情列表 */}
                  <div className="p-4 max-h-60 overflow-y-auto">
                    <div className="grid grid-cols-8 gap-2">
                      {EMOJI_CATEGORIES[selectedEmojiCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleEmojiClick(emoji)}
                          className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent transition-colors text-lg"
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
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-accent transition-colors disabled:opacity-50"
              title="添加图片"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="flex items-center text-sm text-muted-foreground">
                <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                上传中...
              </div>
            )}
          </div>

          {/* 右侧按钮 */}
          <div className="flex items-center space-x-2">
            {onCancel && (
              <button
                type="button"
                onClick={() => {
                  // 清理缓存的图片
                  cachedImages.forEach(img => {
                    removeCachedImage(img.id);
                  });
                  setCachedImages([]);
                  setContent('');
                  onCancel();
                }}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                取消
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !content.trim() || isUploading}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                content.trim() && !isSubmitting && !isUploading
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              {isSubmitting ? '发送中...' : '发送'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CommentInput; 