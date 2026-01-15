'use client';

import { useState, useEffect, useRef } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
  children?: TocItem[];
}

interface TableOfContentsProps {
  content: string;
  className?: string;
  readProgress?: number;
}

export default function TableOfContents({ content, className = '', readProgress = 0 }: TableOfContentsProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const tocContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // 解析标题
    const headings = parseHeadings(content);
    const structuredToc = buildTocTree(headings);
    setToc(structuredToc);
    
    // 默认展开一级和二级标题
    const defaultExpanded = new Set<string>();
    const allHeadings = getAllHeadings(structuredToc);
    allHeadings.filter(h => h.level <= 2).forEach(h => {
      defaultExpanded.add(h.id);
    });
    setExpandedSections(defaultExpanded);
    
    console.log(`[TOC] 构建完成，共 ${headings.length} 个标题，${structuredToc.length} 个根节点`);
  }, [content]);

  useEffect(() => {
    // 监听滚动事件，高亮当前标题并自动展开
    const handleScroll = () => {
      const allHeadings = getAllHeadings(toc);
      const headingElements = allHeadings.map(item => 
        document.getElementById(item.id)
      ).filter(Boolean);

      let currentActiveId = '';
      
      for (let i = headingElements.length - 1; i >= 0; i--) {
        const element = headingElements[i];
        if (element && element.offsetTop <= window.scrollY + 120) {
          currentActiveId = element.id;
          break;
        }
      }
      
      if (currentActiveId && currentActiveId !== activeId) {
        setActiveId(currentActiveId);
        
        // 自动展开当前章节的父级和子级
        const currentHeading = allHeadings.find(h => h.id === currentActiveId);
        if (currentHeading) {
          const newExpanded = new Set(expandedSections);
          
          // 展开父级章节
          const parentHeadings = findParentHeadings(allHeadings, currentHeading);
          parentHeadings.forEach(parent => newExpanded.add(parent.id));
          
          // 展开当前章节
          newExpanded.add(currentActiveId);
          
          setExpandedSections(newExpanded);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始执行一次
    return () => window.removeEventListener('scroll', handleScroll);
  }, [toc, activeId]);

  // 自动滚动激活项到目录中央（优化版）
  useEffect(() => {
    if (activeId && activeItemRef.current && tocContainerRef.current) {
      const container = tocContainerRef.current;
      const activeItem = activeItemRef.current;
      
      // 使用 requestAnimationFrame 确保 DOM 更新完成
      requestAnimationFrame(() => {
        // 获取容器和元素的位置信息
        const containerRect = container.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        
        // 计算元素相对于容器的位置
        const relativeTop = itemRect.top - containerRect.top + container.scrollTop;
        
        // 计算使元素居中所需的滚动位置
        const scrollTo = relativeTop - (containerRect.height / 2) + (itemRect.height / 2);
        
        // 使用平滑滚动
        container.scrollTo({
          top: Math.max(0, scrollTo),
          behavior: 'smooth'
        });
      });
    }
  }, [activeId, expandedSections]); // 添加 expandedSections 依赖，确保展开时也重新定位

  const parseHeadings = (markdown: string): TocItem[] => {
    // 增强的标题提取正则，支持行首可能的空格
    const headingRegex = /^\s*(#{1,6})\s+(.+?)(?:\s*\{#[^}]*\})?\s*$/gm;
    const headings: TocItem[] = [];
    let match;

    // 重置正则的 lastIndex
    headingRegex.lastIndex = 0;

    while ((match = headingRegex.exec(markdown)) !== null) {
      const level = match[1].length;
      const headingText = match[2].trim();
      const id = generateId(headingText);
      
      // 跳过空标题
      if (!headingText) {
        continue;
      }
      
      headings.push({
        id,
        text: headingText,
        level,
        children: []
      });
      
      // 调试日志（生产环境可移除）
      console.log(`[TOC] 解析标题: ${headingText} (Level ${level}, ID: ${id})`);
    }

    console.log(`[TOC] 共解析 ${headings.length} 个标题`);
    return headings;
  };

  // 构建树形结构
  const buildTocTree = (headings: TocItem[]): TocItem[] => {
    const root: TocItem[] = [];
    const stack: TocItem[] = [];

    headings.forEach(heading => {
      const newItem = { ...heading, children: [] };
      
      while (stack.length > 0 && stack[stack.length - 1].level >= newItem.level) {
        stack.pop();
      }
      
      if (stack.length === 0) {
        root.push(newItem);
      } else {
        const parent = stack[stack.length - 1];
        if (!parent.children) parent.children = [];
        parent.children.push(newItem);
      }
      
      stack.push(newItem);
    });

    return root;
  };

  // 获取所有标题（扁平化）
  const getAllHeadings = (items: TocItem[]): TocItem[] => {
    let result: TocItem[] = [];
    items.forEach(item => {
      result.push(item);
      if (item.children && item.children.length > 0) {
        result = result.concat(getAllHeadings(item.children));
      }
    });
    return result;
  };

  // 查找父级标题
  const findParentHeadings = (allHeadings: TocItem[], current: TocItem): TocItem[] => {
    const parents: TocItem[] = [];
    const currentIndex = allHeadings.findIndex(h => h.id === current.id);
    
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (allHeadings[i].level < current.level) {
        parents.unshift(allHeadings[i]);
        if (allHeadings[i].level === 1) break;
      }
    }
    
    return parents;
  };

  const generateId = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    }
  };

  const toggleSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  const renderTocItem = (item: TocItem, depth: number = 0, isLastChild: boolean = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.id);
    const isActive = activeId === item.id;

    return (
      <div key={item.id} className="relative toc-item">
        {/* 层级指引线 - 增强版 */}
        {depth > 0 && (
          <>
            <div 
              className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-border/60 via-border/40 to-border/20 transition-colors"
              style={{ 
                left: `${(depth - 1) * 16 + 8}px`,
                height: isLastChild ? '50%' : '100%'
              }}
            />
            <div 
              className="absolute top-3 w-2.5 h-px bg-border/50"
              style={{ left: `${(depth - 1) * 16 + 8}px` }}
            />
          </>
        )}

        <div className="relative flex items-center group">
          {/* 左侧滑动滑块 - 激活指示器 */}
          {isActive && !hasChildren && (
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-lg shadow-primary/50 transition-all duration-300 animate-in slide-in-from-left"
              style={{
                boxShadow: '0 0 12px var(--primary)',
              }}
            />
          )}

          {hasChildren && (
            <button
              onClick={(e) => toggleSection(item.id, e)}
              type="button"
              aria-label={isExpanded ? '折叠章节' : '展开章节'}
              className={`absolute left-0 w-5 h-5 flex items-center justify-center transition-all z-20 rounded-md ${
                isExpanded 
                  ? 'text-primary bg-primary/10 hover:bg-primary/20' 
                  : 'text-muted-foreground hover:text-primary hover:bg-accent/50'
              }`}
              style={{ 
                left: `${depth * 16}px`,
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <svg 
                className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          
          <button
            ref={isActive ? activeItemRef : null}
            onClick={() => scrollToHeading(item.id)}
            type="button"
            data-toc-item={item.id}
            className={`block w-full text-left py-2 text-sm transition-all duration-300 rounded-r cursor-pointer relative z-10 overflow-hidden ${
              isActive 
                ? 'text-primary font-semibold bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pl-3' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40 hover:pl-3'
            }`}
            style={{
              paddingLeft: `${depth * 16 + (hasChildren ? 24 : 8)}px`,
              paddingRight: '12px',
              marginLeft: isActive && !hasChildren ? '4px' : '0',
              transform: isActive ? 'translateX(0)' : undefined,
            }}
            title={item.text}
          >
            <span className="block truncate leading-5 relative">
              {item.text}
              {/* 激活状态下的微光效果 */}
              {isActive && (
                <span 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer"
                  style={{
                    backgroundSize: '200% 100%',
                  }}
                />
              )}
            </span>
          </button>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="toc-children relative overflow-hidden">
            <div className="animate-in slide-in-from-top-2 fade-in duration-300">
              {item.children!.map((child, index) => 
                renderTocItem(child, depth + 1, index === item.children!.length - 1)
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (toc.length === 0) {
    return null;
  }

  return (
    <nav className={`toc-navigation ${className} relative rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm`}>
      {/* 标题栏 - 带阅读进度 */}
      <div className="text-sm font-semibold text-foreground px-4 pt-4 pb-3 flex items-center justify-between gap-2 sticky top-0 bg-card/95 backdrop-blur-sm z-20 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-primary rounded-full" />
          <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">目录</span>
        </div>
        {/* 阅读进度 */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="relative w-14 h-1.5 bg-muted rounded-full overflow-hidden shadow-inner">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${readProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </div>
          <span className="text-muted-foreground font-semibold min-w-[2.5rem] text-right tabular-nums">
            {Math.round(readProgress)}%
          </span>
        </div>
      </div>

      {/* 目录内容区 - 可滚动，美化滚动条 */}
      <div 
        ref={tocContainerRef}
        className="space-y-0.5 overflow-y-auto relative px-3 py-4 toc-scrollbar"
        style={{ 
          maxHeight: 'calc(100vh - 200px)',
          paddingBottom: '2rem',
          scrollbarGutter: 'stable'
        }}
      >
        {toc.map((item, index) => renderTocItem(item, 0, index === toc.length - 1))}
        
        {/* 底部渐变遮罩 - 增强版 */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, var(--card) 70%)'
          }}
        />
      </div>

      {/* 自定义滚动条样式 */}
      <style jsx>{`
        .toc-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .toc-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .toc-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 3px;
          transition: background 0.2s;
        }
        
        .toc-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.6);
        }

        /* Firefox */
        .toc-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--border)) transparent;
        }

        /* 闪光动画 */
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .animate-shimmer {
          animation: shimmer 3s infinite linear;
        }
      `}</style>
    </nav>
  );
} 