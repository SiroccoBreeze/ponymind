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
    // 创建模板命令
    {
      name: 'template',
      keyCommand: 'template',
      buttonProps: { 'aria-label': '插入问题模板' },
      icon: (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 3 13.5v-9zM4.5 4a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-9z"/>
          <path d="M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0zM7 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0z"/>
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