'use client';

import React, { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

// 动态导入 MDEditor 以避免 SSR 问题
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface MarkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
  height?: number;
  placeholder?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  height = 500,
  placeholder = '请输入内容...'
}) => {
  const [loading, setLoading] = useState(false);

  // 处理内容变化
  const handleChange = useCallback((val?: string) => {
    onChange?.(val || '');
  }, [onChange]);

  // 优化长文档的编辑器配置
  const editorProps = useMemo(() => ({
    value: value || '',
    onChange: handleChange,
    placeholder,
    height: Math.max(height, 400), // 设置合理的最小高度
    preview: 'edit' as const, // 默认编辑模式，避免长文档渲染压力
    hideToolbar: false,
    autoFocus: true,
    textareaProps: {
      // 优化长文档编辑体验
      style: {
        fontSize: '14px',
        lineHeight: '1.6',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        padding: '16px',
        minHeight: '400px', // 设置合理的最小高度
        resize: 'vertical' as const,
        overflowY: 'auto' as const,
        wordWrap: 'break-word' as const,
        whiteSpace: 'pre-wrap' as const,
      },
      placeholder,
      spellCheck: false, // 长文档时禁用拼写检查提升性能
    }
  }), [value, handleChange, placeholder, height]);

  return (
    <div className="markdown-editor-container">
      <div className="w-full">
        {typeof window !== 'undefined' && (
          <MDEditor
            {...editorProps}
          />
        )}
      </div>
      
      <style jsx global>{`
        /* 长文档编辑优化样式 */
        .w-md-editor {
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          height: auto !important;
        }
        
        /* 编辑器容器 */
        .w-md-editor-text-container {
          min-height: 400px !important;
          height: auto !important;
        }

        /* 编辑器文本区域 */
        .w-md-editor-text-textarea,
        .w-md-editor-text {
          font-size: 14px !important;
          line-height: 1.6 !important;
          color: #374151 !important;
          /* 长文档滚动优化 */
          overflow-y: auto !important;
          scroll-behavior: smooth !important;
          min-height: 400px !important;
          resize: vertical !important;
          height: auto !important;
          max-height: none !important;
        }

        /* 优化滚动条 */
        .w-md-editor-text-textarea::-webkit-scrollbar,
        .w-md-editor-text::-webkit-scrollbar {
          width: 8px;
        }

        .w-md-editor-text-textarea::-webkit-scrollbar-track,
        .w-md-editor-text::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .w-md-editor-text-textarea::-webkit-scrollbar-thumb,
        .w-md-editor-text::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .w-md-editor-text-textarea::-webkit-scrollbar-thumb:hover,
        .w-md-editor-text::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* 预览区域 */
        .w-md-editor-preview {
          overflow-y: auto !important;
          min-height: 400px !important;
          scroll-behavior: smooth !important;
          resize: vertical !important;
        }

        /* 全屏模式 */
        .w-md-editor-fullscreen {
          z-index: 9999 !important;
          height: 100vh !important;
        }

        .w-md-editor-fullscreen .w-md-editor-text-container {
          height: calc(100vh - 100px) !important;
        }

        .w-md-editor-fullscreen .w-md-editor-text,
        .w-md-editor-fullscreen .w-md-editor-text-textarea,
        .w-md-editor-fullscreen .w-md-editor-preview {
          height: calc(100vh - 100px) !important;
          max-height: calc(100vh - 100px) !important;
        }

        /* 响应式优化 */
        @media (max-width: 768px) {
          .w-md-editor-text-textarea,
          .w-md-editor-text {
            font-size: 13px !important;
            padding: 12px !important;
          }
        }

        /* 代码块优化 */
        .w-md-editor-preview pre {
          max-height: 400px !important;
          overflow-y: auto !important;
        }

        /* 表格优化 */
        .w-md-editor-preview table {
          max-width: 100% !important;
          overflow-x: auto !important;
        }
      `}</style>
    </div>
  );
};

export default MarkdownEditor; 