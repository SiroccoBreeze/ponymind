'use client';

import dynamic from 'next/dynamic';

const MarkdownPreview = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => ({ default: mod.default.Markdown })),
  { ssr: false }
);

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  truncate?: number;
}

export default function MarkdownPreviewComponent({ content, className = '', truncate }: MarkdownPreviewProps) {
  let displayContent = content;
  
  if (truncate && content.length > truncate) {
    // 简单截断，保持Markdown格式
    displayContent = content.substring(0, truncate) + '...';
  }

  return (
    <div className={`wmde-markdown-preview ${className}`} data-color-mode="light">
      <MarkdownPreview 
        source={displayContent}
        style={{ 
          backgroundColor: 'transparent',
          color: 'inherit',
          fontFamily: 'inherit'
        }}
      />
    </div>
  );
} 