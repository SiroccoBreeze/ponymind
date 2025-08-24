'use client';

import React, { useCallback, useState, useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { commands } from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

// 动态导入 MDEditor 以避免 SSR 问题
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface UploadedImage {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
}

interface MarkdownEditorWithUploadProps {
  value: string;
  onChange?: (value: string) => void;
  height?: number;
  placeholder?: string;
  preview?: 'live' | 'edit' | 'preview';
  className?: string;
  onSaved?: () => void; // 当内容保存时调用，用于清理标记
}

const MarkdownEditorWithUpload = forwardRef<
  { 
    markAsSaved: () => void;
    getUploadedImageIds: () => string[];
  },
  MarkdownEditorWithUploadProps
>(({
  value,
  onChange,
  height = 500,
  placeholder = '请输入内容...',
  preview = 'live',
  className = '',
  onSaved
}, ref) => {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const sessionUploadedImages = useRef<string[]>([]); // 本次会话上传的图片ID
  const [isSaved, setIsSaved] = useState(false); // 标记是否已保存
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pendingDeleteImageId, setPendingDeleteImageId] = useState<string | null>(null);

  // 获取本次会话上传的图片ID列表
  const getUploadedImageIds = useCallback(() => {
    return sessionUploadedImages.current;
  }, []);

  // 清理未保存的图片
  useEffect(() => {
    return () => {
      // 组件卸载时，只有未保存的情况下才删除图片
      if (!isSaved && sessionUploadedImages.current.length > 0) {
        sessionUploadedImages.current.forEach(async (imageId) => {
          try {
            await fetch(`/api/images/${imageId}`, {
              method: 'DELETE',
            });
          } catch (error) {
            console.error('清理图片失败:', error);
          }
        });
      }
    };
  }, [isSaved]);



  // 当内容保存时清理标记
  const markAsSaved = useCallback(() => {
    setIsSaved(true);
    sessionUploadedImages.current = []; // 清空待清理列表
    onSaved?.();
  }, [onSaved]);

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    markAsSaved,
    getUploadedImageIds
  }), [markAsSaved, getUploadedImageIds]);

  // 处理内容变化
  const handleChange = useCallback((val?: string) => {
    onChange?.(val || '');
  }, [onChange]);

  // 在光标位置插入文本
  const insertTextAtCursor = useCallback((textToInsert: string) => {
    // 延迟执行，确保编辑器已经渲染完成
    setTimeout(() => {
      // 尝试多种方式获取编辑器的 textarea
      const selectors = [
        '.w-md-editor-text-textarea',
        '.w-md-editor textarea',
        '.w-md-editor-text textarea', 
        '.w-md-editor .w-md-editor-text textarea',
        'textarea[data-testid="text-area"]',
        '.CodeMirror textarea'
      ];
      
      let textarea: HTMLTextAreaElement | null = null;
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        // 找到可见且可编辑的 textarea
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i] as HTMLTextAreaElement;
          if (el.offsetWidth > 0 && el.offsetHeight > 0 && !el.disabled && !el.readOnly) {
            textarea = el;
            break;
          }
        }
        if (textarea) break;
      }
      
      if (textarea) {
        // 确保 textarea 获得焦点
        textarea.focus();
        
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const currentValue = value || '';
        
        // 在光标位置插入文本
        const beforeText = currentValue.substring(0, start);
        const afterText = currentValue.substring(end);
        
        // 智能换行处理
        let prefix = '';
        let suffix = '';
        
        if (beforeText && !beforeText.endsWith('\n')) {
          prefix = beforeText.endsWith(' ') ? '\n' : '\n\n';
        }
        
        if (afterText && !afterText.startsWith('\n')) {
          suffix = afterText.startsWith(' ') ? '\n' : '\n\n';
        }
        
        const finalText = beforeText + prefix + textToInsert + suffix + afterText;
        
        handleChange(finalText);
        
        // 设置新的光标位置
        setTimeout(() => {
          const newCursorPos = start + prefix.length + textToInsert.length + suffix.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      } else {
        // 如果没有获取到 textarea，则在末尾插入
        const newValue = value + (value ? '\n\n' : '') + textToInsert;
        handleChange(newValue);
      }
    }, 100); // 给编辑器一些时间来渲染
  }, [value, handleChange]);

  // 上传图片
  const uploadImages = useCallback(async (files: FileList | File[]) => {
    if (!session) {
      toast.error('请先登录后再上传图片');
      return;
    }

    const fileArray = Array.from(files);
    
    // 验证文件数量
    if (fileArray.length > 50) {
      toast.error('一次最多只能上传50张图片');
      return;
    }

    // 验证文件类型和大小
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of fileArray) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`文件 ${file.name} 格式不支持，仅支持 JPG、PNG、GIF、WebP 格式`);
        return;
      }
      if (file.size > maxSize) {
        toast.error(`文件 ${file.name} 大小超过 5MB 限制`);
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      fileArray.forEach(file => {
        formData.append('images', file);
      });

      // 创建 XMLHttpRequest 以支持进度显示
      const xhr = new XMLHttpRequest();
      
      // 上传进度
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      };

      // 上传完成
      const uploadPromise = new Promise<UploadedImage[]>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              resolve(response.images);
            } else {
              reject(new Error(response.error));
            }
          } else {
            reject(new Error('上传失败'));
          }
        };

        xhr.onerror = () => reject(new Error('网络错误'));
      });

      xhr.open('POST', '/api/images/upload');
      xhr.send(formData);

      const newImages = await uploadPromise;
      setUploadedImages(prev => [...prev, ...newImages]);

      // 记录本次会话上传的图片ID（用于清理）
      sessionUploadedImages.current.push(...newImages.map(img => img.id));

      // 自动插入markdown图片语法
      const imageMarkdown = newImages.map(img => 
        `![${img.originalName}](${img.url})`
      ).join('\n\n');

      insertTextAtCursor(imageMarkdown);

      toast.success(`成功上传 ${newImages.length} 张图片`);

    } catch (error) {
      console.error('上传失败:', error);
      toast.error('图片上传失败，请重试');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [session, insertTextAtCursor]);

  // 处理粘贴事件
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      // 检查是否在编辑器区域内
      const target = event.target as HTMLElement;
      const isInEditor = target.closest('.markdown-editor-container') || 
                        target.closest('.w-md-editor') ||
                        target.closest('[data-color-mode]');
      
      if (!isInEditor) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        event.preventDefault();
        await uploadImages(imageFiles);
      }
    };

    // 监听整个文档的粘贴事件
    document.addEventListener('paste', handlePaste);
    
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [uploadImages]);

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      uploadImages(files);
    }
    // 清空input值，允许重新选择相同文件
    event.target.value = '';
  };

  // 处理拖拽
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      uploadImages(files);
    }
  };

  // 插入图片
  const insertImage = (imageUrl: string, alt: string = '图片') => {
    const imageMarkdown = `![${alt}](${imageUrl})`;
    insertTextAtCursor(imageMarkdown);
    setShowImageModal(false);
  };

  // 删除图片
  const deleteImage = async (imageId: string) => {
    setPendingDeleteImageId(imageId);
    setIsDeleteDialogOpen(true);
  };
  const confirmDeleteImage = async () => {
    if (!pendingDeleteImageId) return;
    setIsDeleteDialogOpen(false);
    try {
      const response = await fetch(`/api/images/${pendingDeleteImageId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setUploadedImages(prev => prev.filter(img => img.id !== pendingDeleteImageId));
        toast.success('图片删除成功');
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      console.error('删除图片失败:', error);
      toast.error('删除失败');
    } finally {
      setPendingDeleteImageId(null);
    }
  };

  // 自定义图片按钮处理函数 - 直接打开文件选择框
  const handleImageCommand = useCallback(() => {
    if (isUploading) return;
    fileInputRef.current?.click();
  }, [isUploading]);

  // 重写图片命令，集成上传和图片库功能
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commandsFilter = useCallback((command: any) => {
    if (command.name === 'image') {
      return {
        ...command,
        execute: handleImageCommand,
        buttonProps: { 'aria-label': '插入图片 (上传/选择)' }
      };
    }
    return command;
  }, [handleImageCommand]);

  // 添加右上角的工具栏按钮（预览模式切换和全屏）
  const extraCommands = useMemo(() => [
    commands.codeEdit,
    commands.codeLive,
    commands.codePreview, 
    commands.divider,
    // 创建模板命令
    {
      name: 'template',
      keyCommand: 'template',
      buttonProps: { 'aria-label': '插入问题模板' },
      icon: (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 3 13.5v-9zM4.5 4a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-9z"/>
          <path d="M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0zM7 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0z"/>
        </svg>
      ),
      execute: (state: any, api: any) => {
        const template = `* **系统**：
* **版本**：
* **菜单**：
* **问题描述**：`;
        
        // 获取当前光标位置
        const { text, selection } = state;
        const { start, end } = selection;
        
        // 智能换行处理
        let prefix = '';
        let suffix = '';
        
        if (start > 0 && !text.substring(0, start).endsWith('\n')) {
          prefix = '\n\n';
        }
        
        if (end < text.length && !text.substring(end).startsWith('\n')) {
          suffix = '\n\n';
        }
        
        // 在光标位置插入模板
        const newText = text.substring(0, start) + prefix + template + suffix + text.substring(end);
        
        // 使用 onChange 回调来更新内容
        if (onChange) {
          onChange(newText);
        }
        
        // 延迟设置光标位置，确保内容更新完成
        setTimeout(() => {
          const textarea = document.querySelector('.w-md-editor-text textarea') as HTMLTextAreaElement;
          if (textarea) {
            const newCursorPosition = start + prefix.length + 8; // 8 = "* **系统**：".length
            textarea.setSelectionRange(newCursorPosition, newCursorPosition);
            textarea.focus();
          }
        }, 100);
      }
    },
    commands.divider,
    commands.fullscreen
  ], []);

  // 避免 SSR 问题
  if (typeof window === 'undefined') {
    return (
      <div 
        className={`border rounded-lg bg-muted flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-muted-foreground">加载编辑器中...</div>
      </div>
    );
  }

  return (
    <div className={`markdown-editor-container relative ${className}`}>
      {/* 上传进度遮罩 */}
      {isUploading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center rounded-lg">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center min-w-[300px]">
            <div className="mb-4">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="text-gray-700 mb-2">正在上传图片...</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-500 mt-2">{uploadProgress}%</div>
          </div>
        </div>
      )}

      {/* 拖拽上传覆盖层 */}
      {dragOver && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-dashed border-blue-500 z-40 flex items-center justify-center rounded-lg">
          <div className="text-blue-600 text-lg font-medium">松开鼠标上传图片</div>
        </div>
      )}

      {/* 粘贴上传提示 */}
      {/* <div className="absolute top-2 right-2 z-30">
        <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md opacity-75">
          支持粘贴图片 (Ctrl+V)
        </div>
      </div> */}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 编辑器 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <MDEditor
          value={value || ''}
          onChange={handleChange}
          height={height}
          data-color-mode={theme === 'dark' ? 'dark' : 'light'}
          preview={preview}
          visibleDragbar={true}
          extraCommands={extraCommands}
          commandsFilter={commandsFilter}
          textareaProps={{
            placeholder,
            style: {
              fontSize: '14px',
              lineHeight: '1.6',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
            }
          }}
        />
      </div>

      {/* 图片库模态框 */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">图片库</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    上传图片
                  </button>
                  <button
                    onClick={() => setShowImageModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {uploadedImages.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" />
                  </svg>
                  <p className="text-gray-500">暂无上传的图片</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    上传图片
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {uploadedImages.map((image) => (
                    <div key={image.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-square relative">
                        <img
                          src={image.url}
                          alt={image.originalName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-gray-900 truncate" title={image.originalName}>
                          {image.originalName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(image.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <div className="flex space-x-2 mt-2">
                          <button
                            onClick={() => insertImage(image.url, image.originalName)}
                            className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            插入
                          </button>
                          <button
                            onClick={() => deleteImage(image.id)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 删除图片确认弹窗 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除这张图片吗？</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteImage}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

MarkdownEditorWithUpload.displayName = 'MarkdownEditorWithUpload';

export default MarkdownEditorWithUpload; 