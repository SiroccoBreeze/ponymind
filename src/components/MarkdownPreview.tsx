'use client';

import React, { useState, useMemo, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  truncate?: number;
}

// 代码块组件
const CodeBlock = memo(({ language, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(children));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div className="relative group">
      <SyntaxHighlighter
        style={oneLight}
        language={language}
        PreTag="div"
        showLineNumbers
        wrapLines
        customStyle={{
          borderRadius: '12px',
          fontSize: '14px',
          margin: '20px 0',
          padding: '20px',
          backgroundColor: '#fafafa',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
      
      {/* 复制按钮 */}
      <button
        onClick={handleCopy}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 shadow-sm"
      >
        {copied ? (
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-600">已复制</span>
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

// 稳定的图片组件，避免闪烁
const StableImage = memo(({ src, alt, ...props }: any) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <span className="inline-block bg-gray-100 border border-gray-200 rounded-lg p-4 text-center my-2 text-sm text-gray-500">
        🖼️ 图片加载失败
      </span>
    );
  }

  return (
    <>
      {!loaded && (
        <span className="inline-block animate-pulse bg-gray-200 rounded-lg px-4 py-2 text-sm text-gray-500">
          📷 加载中...
        </span>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`max-w-full h-auto rounded-lg shadow-md border border-gray-200 my-6 transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0 absolute'
        }`}
        style={{ display: loaded ? 'block' : 'none' }}
        {...props}
      />
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
      
      return !isInline && language ? (
        <CodeBlock language={language} {...props}>
          {children}
        </CodeBlock>
      ) : (
        <code className="bg-gray-100 px-2 py-1 rounded-md text-sm font-mono text-gray-800 border border-gray-200" {...props}>
          {children}
        </code>
      );
    },
    // 表格样式
    table({ children }: any) {
      return (
        <div className="overflow-x-auto my-8 rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }: any) {
      return (
        <thead className="bg-gray-50">
          {children}
        </thead>
      );
    },
    tbody({ children }: any) {
      return (
        <tbody className="bg-white divide-y divide-gray-200">
          {children}
        </tbody>
      );
    },
    th({ children }: any) {
      return (
        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
          {children}
        </th>
      );
    },
    td({ children }: any) {
      return (
        <td className="px-6 py-4 text-sm text-gray-900 align-top">
          {children}
        </td>
      );
    },
    // 标题样式
    h1({ children }: any) {
      const id = generateId(String(children));
      return <h1 id={id} className="text-3xl font-bold text-gray-900 mb-6 mt-8 pb-3 border-b border-gray-200" style={{ scrollMarginTop: '100px' }}>{children}</h1>;
    },
    h2({ children }: any) {
      const id = generateId(String(children));
      return <h2 id={id} className="text-2xl font-bold text-gray-900 mb-5 mt-8" style={{ scrollMarginTop: '100px' }}>{children}</h2>;
    },
    h3({ children }: any) {
      const id = generateId(String(children));
      return <h3 id={id} className="text-xl font-bold text-gray-900 mb-4 mt-6" style={{ scrollMarginTop: '100px' }}>{children}</h3>;
    },
    h4({ children }: any) {
      const id = generateId(String(children));
      return <h4 id={id} className="text-lg font-semibold text-gray-900 mb-3 mt-5" style={{ scrollMarginTop: '100px' }}>{children}</h4>;
    },
    h5({ children }: any) {
      const id = generateId(String(children));
      return <h5 id={id} className="text-base font-semibold text-gray-900 mb-2 mt-4" style={{ scrollMarginTop: '100px' }}>{children}</h5>;
    },
    h6({ children }: any) {
      const id = generateId(String(children));
      return <h6 id={id} className="text-sm font-semibold text-gray-900 mb-2 mt-3" style={{ scrollMarginTop: '100px' }}>{children}</h6>;
    },
    // 段落样式 - 优化处理仅包含图片的段落
    p({ children, node }: any) {
      // 检查段落是否只包含图片
      const hasOnlyImage = node && node.children && 
        node.children.length === 1 && 
        node.children[0].tagName === 'img';
      
      // 如果段落只包含图片，返回一个div包装器而不是p标签
      if (hasOnlyImage) {
        return <div className="my-6">{children}</div>;
      }
      
      return <p className="mb-6 leading-relaxed text-gray-700 text-base">{children}</p>;
    },
    // 链接样式
    a({ href, children }: any) {
      return (
        <a 
          href={href} 
          className="text-blue-600 hover:text-blue-800 underline font-medium transition-colors decoration-blue-300 hover:decoration-blue-500"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    },
    // 列表样式
    ul({ children }: any) {
      return <ul className="list-disc list-inside mb-6 space-y-2 ml-6 text-gray-700">{children}</ul>;
    },
    ol({ children }: any) {
      return <ol className="list-decimal list-inside mb-6 space-y-2 ml-6 text-gray-700">{children}</ol>;
    },
    li({ children, className }: any) {
      // 检查是否为任务列表项
      const isTaskListItem = className?.includes('task-list-item') || 
                             (typeof children === 'object' && 
                              Array.isArray(children) && 
                              children.some((child: any) => 
                                child?.type === 'input' && child?.props?.type === 'checkbox'
                              ));
      
      return (
        <li className={`leading-relaxed ${isTaskListItem ? 'list-none -ml-6 flex items-center' : ''}`}>
          {children}
        </li>
      );
    },
    // 引用样式
    blockquote({ children }: any) {
      return (
        <blockquote className="border-l-4 border-blue-500 pl-6 py-4 mb-6 bg-blue-50 rounded-r-lg">
          <div className="text-gray-700 italic font-medium">{children}</div>
        </blockquote>
      );
    },
    // 分隔线
    hr() {
      return <hr className="my-8 border-t-2 border-gray-200" />;
    },
    // 强调文本
    strong({ children }: any) {
      return <strong className="font-bold text-gray-900">{children}</strong>;
    },
    em({ children }: any) {
      return <em className="italic text-gray-700">{children}</em>;
    },
    // 删除线
    del({ children }: any) {
      return <del className="line-through text-gray-500">{children}</del>;
    },
    // 任务列表
    input({ type, checked, ...props }: any) {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mr-3 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={components}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  );
});

MarkdownPreviewComponent.displayName = 'MarkdownPreview';

export default MarkdownPreviewComponent; 