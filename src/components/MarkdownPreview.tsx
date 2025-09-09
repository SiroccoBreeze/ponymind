'use client';

import React, { useState, useMemo, memo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import MermaidDiagram from './MermaidDiagram';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  truncate?: number;
}

// 代码块组件
const CodeBlock = memo(({ language, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // 检测当前主题
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    
    // 监听主题变化
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);
  
  const handleCopy = async () => {
    try {
      // 优先使用现代 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(String(children));
      } else {
        // 降级到传统方法
        const textArea = document.createElement('textarea');
        textArea.value = String(children);
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div className="relative group">
      <SyntaxHighlighter
        style={isDarkMode ? oneDark : oneLight}
        language={language}
        PreTag="div"
        showLineNumbers
        wrapLines
        customStyle={{
          borderRadius: '12px',
          fontSize: '14px',
          margin: '20px 0',
          padding: '20px',
          border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
          boxShadow: isDarkMode 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' 
            : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          lineHeight: '1.6',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        }}
        lineNumberStyle={{
          color: isDarkMode ? '#64748b' : '#94a3b8',
          fontSize: '12px',
          paddingRight: '16px',
          minWidth: '2.5em',
          borderRight: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
          marginRight: '16px',
        }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
      
      {/* 语言标签 */}
      {language && (
        <div className="absolute top-0 left-4 transform -translate-y-1/2">
          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
            isDarkMode 
              ? 'bg-slate-800 text-slate-200 border-slate-600' 
              : 'bg-slate-100 text-slate-700 border-slate-300'
          }`}>
            {language}
          </span>
        </div>
      )}
      
      {/* 复制按钮 */}
      <button
        onClick={handleCopy}
        className={`absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg px-3 py-2 text-sm font-medium shadow-sm border ${
          isDarkMode
            ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200 hover:text-white'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
        }`}
      >
        {copied ? (
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-500">已复制</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>复制</span>
          </div>
        )}
      </button>
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock';

// 优化的图片组件，支持点击放大、懒加载
const StableImage = memo(({ src, alt, ...props }: any) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalImageLoaded, setModalImageLoaded] = useState(false);

  // 重置状态当 src 改变时
  useEffect(() => {
    setLoaded(false);
    setError(false);
    setModalImageLoaded(false);
  }, [src]);

  if (error) {
    return (
      <span className="inline-block bg-muted border border-border rounded-lg p-6 text-center my-4 w-full max-w-md mx-auto">
        <svg className="w-12 h-12 mx-auto mb-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="block text-sm text-muted-foreground">图片加载失败</span>
        {alt && <span className="block text-xs text-muted-foreground mt-1">{alt}</span>}
        <span className="block text-xs text-muted-foreground mt-1 break-all">{src}</span>
      </span>
    );
  }

  return (
    <>
      <span className="inline-block w-full my-4 group">
        {/* 加载占位符 */}
        {!loaded && !error && (
          <span className="block bg-muted rounded min-h-[200px] flex items-center justify-center">
            <span className="text-center">
              <svg className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" />
              </svg>
              <span className="block text-xs text-muted-foreground mb-1">加载图片中...</span>
              <span className="block text-xs text-muted-foreground break-all max-w-xs">{src}</span>
            </span>
          </span>
        )}
        
        {/* 主图片 */}
        <img
          src={src}
          alt={alt || '图片'}
          onLoad={() => {
            console.log('图片加载成功:', src);
            setLoaded(true);
          }}
          onError={(e) => {
            console.error('图片加载失败:', src, e);
            setError(true);
          }}
          onClick={() => {
            if (loaded) {
              setShowModal(true);
              setModalImageLoaded(false); // 重置模态框图片加载状态
            }
          }}
          className={` transition-all duration-300 ${
            loaded 
              ? 'opacity-100 cursor-zoom-in hover:scale-105' 
              : 'opacity-0 pointer-events-none absolute top-0 left-0'
          }`}
          style={{ 
            maxHeight: '300px',
            height: 'auto'
          }}
          loading="lazy"
          {...props}
        />
        
        {/* 图片描述 */}
        {alt && loaded && (
          <span className="block text-center text-sm text-muted-foreground mt-2 italic">{alt}</span>
        )}
      </span>

      {/* 图片预览模态框 */}
      {showModal && (
        <span
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
          style={{ display: 'block' }}
        >
          <span className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center" style={{ display: 'block' }}>
            {/* 关闭按钮 */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute -top-5 right-0 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2 transition-colors"
              title="关闭"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* 加载中提示 */}
            {!modalImageLoaded && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-center">
                  <svg className="w-8 h-8 mx-auto mb-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="block text-sm">加载高清图片中...</span>
                </span>
              </span>
            )}
            
            {/* 大图 */}
            <img
              src={src}
              alt={alt || '图片'}
              onLoad={() => setModalImageLoaded(true)}
              onError={() => setModalImageLoaded(true)}
              className={`rounded-lg transition-opacity duration-300 ${
                modalImageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                maxWidth: '80vw',
                maxHeight: '80vh',
                objectFit: 'contain'
              }}
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* 图片描述 */}
            {alt && modalImageLoaded && (
              <span className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center">
                <span className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded max-w-md">
                  {alt}
                </span>
              </span>
            )}
          </span>
        </span>
      )}
    </>
  );
});

StableImage.displayName = 'StableImage';

const MarkdownPreviewComponent = memo(({ content, className = '', truncate }: MarkdownPreviewProps) => {
  // 使用useMemo确保内容稳定
  const displayContent = useMemo(() => {
    if (truncate && content.length > truncate) {
      return content.substring(0, truncate) + '...';
    }
    return content;
  }, [content, truncate]);

  // 自定义sanitize配置，允许更多HTML标签和样式
  const customSanitizeSchema = useMemo(() => ({
    ...defaultSchema,
    attributes: {
      ...defaultSchema.attributes,
      '*': ['style', 'class', 'id'],
      div: ['style', 'class', 'id'],
      span: ['style', 'class', 'id'],
      p: ['style', 'class', 'id'],
      i: ['class', 'style'],
      svg: ['class', 'style', 'viewBox', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin'],
      path: ['d', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin'],
    },
    tagNames: [
      ...defaultSchema.tagNames || [],
      'div',
      'span',
      'i',
      'svg',
      'path',
      'style'
    ],
    protocols: {
      ...defaultSchema.protocols,
    }
  }), []);

  // 生成标题ID的函数
  const generateId = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // 缓存组件配置
  const components = useMemo(() => ({
    // 代码块渲染
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const isInline = !className?.includes('language-');
      
      // 检查是否为 Mermaid 图表
      if (!isInline && language === 'mermaid') {
        return (
          <MermaidDiagram 
            chart={String(children).replace(/\n$/, '')} 
            className="my-6"
          />
        );
      }
      
      return !isInline && language ? (
        <CodeBlock language={language} {...props}>
          {children}
        </CodeBlock>
      ) : (
        <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-sm font-mono text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium" {...props}>
          {children}
        </code>
      );
    },
    // 表格样式
    table({ children }: any) {
      return (
        <div className="overflow-x-auto my-8 rounded-lg border border-border shadow-sm">
          <table className="markdown-preview-table min-w-full divide-y divide-border">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }: any) {
      return (
        <thead className="bg-muted">
          {children}
        </thead>
      );
    },
    tbody({ children }: any) {
      return (
        <tbody className="bg-background divide-y divide-border">
          {children}
        </tbody>
      );
    },
    th({ children }: any) {
      return (
        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {children}
        </th>
      );
    },
    td({ children }: any) {
      return (
        <td className="px-6 py-4 text-sm text-foreground align-top break-words">
          {children}
        </td>
      );
    },
    // 标题样式
    h1({ children }: any) {
      const id = generateId(String(children));
      return <h1 id={id} className="text-3xl font-bold text-foreground mb-6 mt-8 pb-3 border-b border-border" style={{ scrollMarginTop: '100px' }}>{children}</h1>;
    },
    h2({ children }: any) {
      const id = generateId(String(children));
      return <h2 id={id} className="text-2xl font-bold text-foreground mb-5 mt-8" style={{ scrollMarginTop: '100px' }}>{children}</h2>;
    },
    h3({ children }: any) {
      const id = generateId(String(children));
      return <h3 id={id} className="text-xl font-bold text-foreground mb-4 mt-6" style={{ scrollMarginTop: '100px' }}>{children}</h3>;
    },
    h4({ children }: any) {
      const id = generateId(String(children));
      return <h4 id={id} className="text-lg font-semibold text-foreground mb-3 mt-5" style={{ scrollMarginTop: '100px' }}>{children}</h4>;
    },
    h5({ children }: any) {
      const id = generateId(String(children));
      return <h5 id={id} className="text-base font-semibold text-foreground mb-2 mt-4" style={{ scrollMarginTop: '100px' }}>{children}</h5>;
    },
    h6({ children }: any) {
      const id = generateId(String(children));
      return <h6 id={id} className="text-sm font-semibold text-foreground mb-2 mt-3" style={{ scrollMarginTop: '100px' }}>{children}</h6>;
    },
    // 段落样式 - 优化处理仅包含图片的段落
    p({ children, node }: any) {
      // 更全面地检查段落是否只包含图片
      const hasOnlyImage = node && node.children && 
        (
          // 情况1：只有一个img标签
          (node.children.length === 1 && node.children[0].tagName === 'img') ||
          // 情况2：包含img和少量空白文本
          (node.children.length <= 3 && 
           node.children.some((child: any) => child.tagName === 'img') &&
           node.children.every((child: any) => 
             child.tagName === 'img' || 
             (child.type === 'text' && child.value && child.value.trim().length === 0)
           ))
        );
      
      // 如果段落只包含图片，返回一个div包装器而不是p标签
      if (hasOnlyImage) {
        return <div className="my-6">{children}</div>;
      }
      
      return <p className="mb-6 leading-relaxed text-foreground text-base">{children}</p>;
    },
    // 链接样式
    a({ href, children }: any) {
      return (
        <a 
          href={href} 
          className="text-primary hover:text-primary/80 underline font-medium transition-colors decoration-primary/30 hover:decoration-primary/60"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    },
    // 列表样式
    ul({ children, ...props }: any) {
      return <ul {...props}>{children}</ul>;
    },
    ol({ children, ...props }: any) {
      return <ol {...props}>{children}</ol>;
    },
    li({ children, className, ...props }: any) {
      // 检查是否为任务列表项
      const isTaskListItem = className?.includes('task-list-item') || 
                             (typeof children === 'object' && 
                              Array.isArray(children) && 
                              children.some((child: any) => 
                                child?.type === 'input' && child?.props?.type === 'checkbox'
                              ));
      
      return (
        <li className={`${isTaskListItem ? 'task-list-item flex items-start' : ''}`} {...props}>
          {children}
        </li>
      );
    },
    // 引用样式
    blockquote({ children }: any) {
      return (
        <blockquote className="border-l-4 border-primary pl-6 py-4 mb-6 bg-muted rounded-r-lg">
          <div className="text-muted-foreground italic font-medium">{children}</div>
        </blockquote>
      );
    },
    // 分隔线
    hr() {
      return <hr className="my-8 border-t-2 border-border" />;
    },
    // 强调文本
    strong({ children }: any) {
      return <strong className="font-bold text-foreground">{children}</strong>;
    },
    em({ children }: any) {
      return <em className="italic text-foreground">{children}</em>;
    },
    // 删除线
    del({ children }: any) {
      return <del className="line-through text-muted-foreground">{children}</del>;
    },
    // 任务列表
    input({ type, checked, ...props }: any) {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mr-3 w-4 h-4 rounded border-border text-primary focus:ring-primary"
            {...props}
          />
        );
      }
      return <input type={type} {...props} />;
    },
    // 稳定的图片组件
    img: StableImage,
  }), [generateId]);

  return (
    <div className={`markdown-preview ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, customSanitizeSchema]
        ]}
        components={components}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  );
});

MarkdownPreviewComponent.displayName = 'MarkdownPreview';

export default MarkdownPreviewComponent; 