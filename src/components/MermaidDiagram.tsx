'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 初始化 Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
      },
      sequence: {
        useMaxWidth: true,
      },
      gantt: {
        useMaxWidth: true,
      },
      pie: {
        useMaxWidth: true,
      },
      gitGraph: {
        useMaxWidth: true,
      },
      // 添加更多配置选项来提高兼容性
      themeVariables: {
        primaryColor: '#ff0000',
        primaryTextColor: '#fff',
        primaryBorderColor: '#7C0000',
        lineColor: '#333',
        secondaryColor: '#006100',
        tertiaryColor: '#fff'
      }
    });
  }, []);

  useEffect(() => {
    if (!ref.current || !chart) return;

    const renderDiagram = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 清空容器
        ref.current!.innerHTML = '';

        // 生成唯一ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 渲染图表
        const { svg } = await mermaid.render(id, chart);
        ref.current!.innerHTML = svg;

        setIsLoading(false);
      } catch (err) {
        console.error('Mermaid 渲染失败:', err);
        
        // 解析错误信息，提供更友好的错误提示
        let errorMessage = '图表渲染失败';
        if (err instanceof Error) {
          errorMessage = err.message;
          
          // 提供常见错误的修复建议
          if (errorMessage.includes('Parse error')) {
            errorMessage += '\n\n常见问题修复建议：\n';
            errorMessage += '1. 检查节点标签的括号是否匹配\n';
            errorMessage += '2. 确保箭头语法正确 (--> 或 ---)\n';
            errorMessage += '3. 检查特殊字符是否需要转义\n';
            errorMessage += '4. 确保流程图语法正确 (graph TD 或 flowchart TD)';
          }
        }
        
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [chart]);

  if (error) {
    return (
      <div className={`mermaid-error p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950/20 dark:border-red-800 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="font-medium">图表渲染失败</span>
        </div>
        <div className="mt-2 text-sm text-red-500 dark:text-red-400 whitespace-pre-line">
          {error}
        </div>
        <details className="mt-3">
          <summary className="text-sm text-red-600 dark:text-red-400 cursor-pointer hover:text-red-700 dark:hover:text-red-300">
            查看原始代码
          </summary>
          <pre className="mt-2 p-3 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-800 dark:text-red-200 overflow-x-auto">
            <code>{chart}</code>
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className={`mermaid-container ${className}`}>
      {isLoading && (
        <div className="flex items-center justify-center p-8 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">渲染图表中...</p>
          </div>
        </div>
      )}
      <div 
        ref={ref} 
        className={`mermaid-diagram ${isLoading ? 'hidden' : 'block'}`}
        style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: isLoading ? '200px' : 'auto'
        }}
      />
    </div>
  );
};

export default MermaidDiagram;
