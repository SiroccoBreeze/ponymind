'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

interface MarkdownEditorProps {
  value: string;
  onChange: (value?: string) => void;
  height?: number;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  height = 400
}) => {
  const vditorRef = useRef<HTMLDivElement>(null);
  const vditorInstance = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentValue, setCurrentValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  // 同步外部传入的value
  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  // 安全获取编辑器值
  const safeGetValue = (): string => {
    if (!vditorInstance.current || !isReady) return currentValue;
    try {
      return vditorInstance.current.getValue() || currentValue;
    } catch (error) {
      console.warn('Vditor getValue error:', error);
      return currentValue;
    }
  };

  // 安全设置编辑器值
  const safeSetValue = (newValue: string): void => {
    setCurrentValue(newValue);
    if (!vditorInstance.current || !isReady) return;
    
    try {
      vditorInstance.current.setValue(newValue);
    } catch (error) {
      console.warn('Vditor setValue error:', error);
    }
  };

  // 安全聚焦编辑器
  const safeFocus = (): void => {
    if (!vditorInstance.current || !isReady) return;
    
    try {
      // 尝试聚焦编辑器
      if (vditorInstance.current.focus) {
        vditorInstance.current.focus();
      } else {
        // 如果没有focus方法，尝试聚焦编辑区域
        const textareas = vditorRef.current?.querySelectorAll('textarea, .vditor-textarea, .vditor-ir');
        if (textareas && textareas.length > 0) {
          (textareas[0] as HTMLElement).focus();
        }
      }
    } catch (error) {
      console.warn('Vditor focus error:', error);
    }
  };

  // 安全销毁编辑器实例
  const safeDestroy = (): void => {
    if (!vditorInstance.current) return;
    
    try {
      // 检查Vditor实例是否有完整的结构
      if (vditorInstance.current.vditor && vditorInstance.current.vditor.element) {
        vditorInstance.current.destroy();
      }
    } catch (error) {
      console.warn('Vditor destroy error:', error);
    } finally {
      vditorInstance.current = null;
      setIsReady(false);
    }
  };

  // 处理编辑器容器点击事件
  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // 如果点击的是工具栏，不做处理
    if (target.closest('.vditor-toolbar')) {
      return;
    }
    
    // 如果点击的是编辑区域内的可编辑元素，不做处理
    if (target.closest('.vditor-textarea') || target.closest('.vditor-ir__editor') || target.closest('.vditor-wysiwyg')) {
      return;
    }
    
    // 如果点击的是空白区域、预览区域或内容区域，聚焦编辑器并设置光标位置
    if (target.closest('.vditor-content') || 
        target.closest('.vditor-preview') ||
        target.closest('.vditor-ir') ||
        target.closest('.vditor-wysiwyg') ||
        target.classList.contains('vditor') ||
        target === e.currentTarget) {
      
      e.preventDefault();
      e.stopPropagation();
      
      // 延迟执行聚焦，确保DOM完全渲染
      setTimeout(() => {
        safeFocus();
        
        // 尝试设置光标到点击位置的末尾
        if (vditorInstance.current && vditorInstance.current.vditor) {
          try {
            const editor = vditorInstance.current.vditor.ir?.element || 
                          vditorInstance.current.vditor.wysiwyg?.element ||
                          vditorInstance.current.vditor.sv?.element;
            
            if (editor) {
              const range = document.createRange();
              const selection = window.getSelection();
              
              // 将光标移动到编辑器内容的末尾
              range.selectNodeContents(editor);
              range.collapse(false);
              
              if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
              }
              
              editor.focus();
            }
          } catch (error) {
            console.warn('设置光标位置失败:', error);
          }
        }
      }, 10);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initVditor = async () => {
      if (!vditorRef.current) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // 动态导入Vditor
        const Vditor = (await import('vditor')).default;
        
        if (!mounted) return;

        setIsReady(false);

        // 初始化Vditor
        vditorInstance.current = new Vditor(vditorRef.current, {
          height: 'auto',
          minHeight: 300,
          value: currentValue,
          mode: 'ir', // 使用即时渲染模式
          placeholder: '请输入内容...',
          theme: 'classic',
          icon: 'material', // 改用material图标，更稳定
          typewriterMode: false, // 禁用打字机模式避免问题
          counter: {
            enable: true,
            type: 'text'
          },
          outline: {
            enable: false,
            position: 'left' // 关闭大纲功能减少滚动条冲突
          },
          hint: {
            delay: 200,
            emoji: {
              '+1': '👍',
              '-1': '👎',
              'smile': '😊',
              'sad': '😢',
              'angry': '😠',
              'laugh': '😂',
              'confused': '😕',
              'heart': '❤️',
              'broken_heart': '💔',
              'clap': '👏',
              'tada': '🎉',
              'rocket': '🚀',
              'star': '⭐',
              'sunglasses': '😎',
              'heart_eyes': '😍',
              'kissing_heart': '😘',
              'wink': '😉',
              'relieved': '😌',
              'satisfied': '😌',
              'weary': '😩',
              'tired_face': '😫',
              'triumph': '😤',
              'sob': '😭',
              'scream': '😱',
              'confounded': '😖',
              'disappointed': '😞',
              'astonished': '😲',
              'frowning': '😦',
              'anguished': '😧',
              'open_mouth': '😮',
              'tips': '💡',
              'danger': '🚨',
              'warning': '⚠️',
              'information': 'ℹ️',
              'check': '✅',
              'cross': '❌',
              'arrow_up': '🔼',
              'arrow_down': '🔽',
            }
          },
          preview: {
            delay: 300,
            mode: 'both',
            hljs: {
              lineNumber: true,
              style: 'github'
            },
            markdown: {
              toc: true
            },
            math: {
              inlineDigit: true
            }
          },
          toolbar: [
            'emoji',
            'headings',
            'bold',
            'italic',
            'strike',
            '|',
            'line',
            'quote',
            'list',
            'ordered-list',
            'check',
            '|',
            'upload',
            'link',
            'table',
            'code',
            'inline-code',
            '|',
            'undo',
            'redo',
            '|',
            'content-theme',
            'edit-mode',
            'outline',
            'fullscreen',
            'devtools',
            'export',
            'info'
          ],
          cache: {
            enable: false
          },
          resize: {
            enable: false // 禁用手动调整大小
          },
          after: () => {
            if (mounted) {
              setIsReady(true);
              setIsLoading(false);
              
              // 确保工具栏tooltip正常显示
              const toolbar = vditorRef.current?.querySelector('.vditor-toolbar');
              if (toolbar) {
                toolbar.setAttribute('title', '');
              }

              // 添加点击事件监听器，使整个编辑区域可点击聚焦
              const vditorElement = vditorRef.current;
              if (vditorElement) {
                // 为整个编辑器区域添加点击监听
                const clickHandler = (e: Event) => {
                  const target = e.target as HTMLElement;
                  
                  // 如果点击的是工具栏，不做处理
                  if (target.closest('.vditor-toolbar')) {
                    return;
                  }
                  
                  // 如果点击的是预览区域、空白区域或内容区域，聚焦编辑器
                  if (target.classList.contains('vditor-content') || 
                      target.classList.contains('vditor-preview') ||
                      target.closest('.vditor-preview') ||
                      target.classList.contains('vditor-ir') ||
                      target.classList.contains('vditor-wysiwyg') ||
                      (!target.closest('.vditor-textarea') && !target.closest('.vditor-ir__editor'))) {
                    
                    e.preventDefault();
                    
                    setTimeout(() => {
                      const editor = vditorInstance.current?.vditor?.ir?.element || 
                                   vditorInstance.current?.vditor?.wysiwyg?.element ||
                                   vditorInstance.current?.vditor?.sv?.element;
                      
                      if (editor) {
                        editor.focus();
                        
                        // 设置光标到末尾
                        const range = document.createRange();
                        const selection = window.getSelection();
                        
                        try {
                          range.selectNodeContents(editor);
                          range.collapse(false);
                          
                          if (selection) {
                            selection.removeAllRanges();
                            selection.addRange(range);
                          }
                        } catch (error) {
                          console.warn('设置光标位置失败:', error);
                        }
                      }
                    }, 10);
                  }
                };
                
                vditorElement.addEventListener('click', clickHandler);
                
                // 清理函数
                return () => {
                  vditorElement.removeEventListener('click', clickHandler);
                };
              }
            }
          },
          input: (value: string) => {
            if (mounted) {
              setCurrentValue(value);
              onChange?.(value);
            }
          },
          blur: (value: string) => {
            if (mounted) {
              setCurrentValue(value);
              onChange?.(value);
            }
          }
        });

      } catch (error) {
        console.error('Vditor initialization error:', error);
        if (mounted) {
          setError('编辑器加载失败，请刷新页面重试');
          setIsLoading(false);
        }
      }
    };

    // 延迟初始化，确保DOM完全加载
    const timer = setTimeout(initVditor, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      safeDestroy();
    };
  }, [height]);

  // 监听value变化，更新编辑器内容
  useEffect(() => {
    if (isReady && value !== currentValue) {
      safeSetValue(value);
    }
  }, [value, isReady, currentValue]);

  // 确保内容及时同步
  useEffect(() => {
    if (vditorInstance.current && vditorInstance.current.getValue() !== value) {
      const currentValue = vditorInstance.current.getValue();
      console.log('编辑器内容同步:', {
        propValue: value ? value.substring(0, 100) + '...' : '(空)',
        currentValue: currentValue ? currentValue.substring(0, 100) + '...' : '(空)',
        needsUpdate: currentValue !== value
      });
      
      if (currentValue !== value) {
        vditorInstance.current.setValue(value || '');
      }
    }
  }, [value]);

  // 错误状态显示
  if (error) {
    return (
      <div className="w-full p-8 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">
            ⚠️ 编辑器加载失败
          </div>
          <div className="text-red-500 text-sm mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            刷新页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative" onClick={handleContainerClick}>
      <div ref={vditorRef} className="w-full h-full overflow-auto cursor-text vditor-container" />
      <style jsx>{`
        .vditor-container :global(.vditor) {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        .vditor-container :global(.vditor-content) {
          cursor: text !important;
          min-height: 280px;
          max-height: 600px;
          overflow-y: auto;
          scroll-behavior: smooth;
        }
        .vditor-container :global(.vditor-ir) {
          cursor: text !important;
          min-height: 280px;
          max-height: 600px;
          overflow-y: auto;
        }
        .vditor-container :global(.vditor-wysiwyg) {
          cursor: text !important;
          min-height: 280px;
          max-height: 600px;
          overflow-y: auto;
        }
        .vditor-container :global(.vditor-preview) {
          cursor: text !important;
          max-height: 600px;
          overflow-y: auto;
        }
        .vditor-container :global(.vditor-content > div) {
          cursor: text !important;
          min-height: inherit;
        }
        .vditor-container :global(.vditor-ir__editor) {
          min-height: 280px !important;
          max-height: 600px !important;
          overflow-y: auto !important;
          resize: none !important;
        }
        .vditor-container :global(.vditor-wysiwyg__editor) {
          min-height: 280px !important;
          max-height: 600px !important;
          overflow-y: auto !important;
          resize: none !important;
        }
        .vditor-container :global(.vditor-toolbar) {
          border-bottom: 1px solid #e5e7eb;
        }
        /* 隐藏多余的滚动条 */
        .vditor-container :global(.vditor-content::-webkit-scrollbar) {
          width: 6px;
        }
        .vditor-container :global(.vditor-content::-webkit-scrollbar-track) {
          background: #f1f5f9;
        }
        .vditor-container :global(.vditor-content::-webkit-scrollbar-thumb) {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .vditor-container :global(.vditor-content::-webkit-scrollbar-thumb:hover) {
          background: #94a3b8;
        }
      `}</style>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-lg">
          <div className="flex items-center space-x-3 text-gray-600 bg-white px-4 py-2 rounded-lg shadow-sm border">
            <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium">编辑器加载中...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor; 