'use client';

import React, { useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { commands } from '@uiw/react-md-editor';
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
  preview?: 'live' | 'edit' | 'preview';
  className?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  height = 500,
  placeholder = '请输入内容...',
  preview = 'live',
  className = ''
}) => {
  const { theme } = useTheme();

  // 处理内容变化
  const handleChange = useCallback((val?: string) => {
    onChange?.(val || '');
  }, [onChange]);

  // 添加右上角的工具栏按钮（预览模式切换和全屏）
  const extraCommands = useMemo(() => [
    commands.codeEdit,
    commands.codeLive,
    commands.codePreview, 
    commands.divider,
    commands.fullscreen
  ], []);

  // 避免 SSR 问题
  if (typeof window === 'undefined') {
    return (
      <div 
        className={`border rounded-lg bg-gray-50 flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-gray-500">加载编辑器中...</div>
      </div>
    );
  }

  return (
    <div className={`markdown-editor-container ${className}`}>
      <MDEditor
        value={value || ''}
        onChange={handleChange}
        height={height}
        data-color-mode={theme === 'dark' ? 'dark' : 'light'}
        preview={preview}
        visibleDragbar={true}
        extraCommands={extraCommands}
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
  );
};

export default MarkdownEditor; 