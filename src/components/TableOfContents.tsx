'use client';

import { useState, useEffect, useCallback } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
  originalText: string;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
}

export default function TableOfContents({ content, className = '' }: TableOfContentsProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  // 生成标题ID
  const generateId = useCallback((text: string, index: number) => {
    return `toc-${index}`;
  }, []);

  // 解析Markdown内容中的标题
  useEffect(() => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const items: TocItem[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = generateId(text, items.length);
      
      items.push({
        id,
        text,
        level,
        originalText: text,
      });
    }

    setTocItems(items);
  }, [content, generateId]);

  // 为Markdown渲染后的标题添加ID
  useEffect(() => {
    if (tocItems.length === 0) return;

    const addIdsToHeadings = () => {
      const timer = setTimeout(() => {
        const possibleSelectors = [
          '.prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6',
          '.wmde-markdown h1, .wmde-markdown h2, .wmde-markdown h3, .wmde-markdown h4, .wmde-markdown h5, .wmde-markdown h6',
          'article h1, article h2, article h3, article h4, article h5, article h6',
          '.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6',
          'h1, h2, h3, h4, h5, h6'
        ];

        let headingElements: NodeListOf<HTMLElement> | null = null;

        for (const selector of possibleSelectors) {
          headingElements = document.querySelectorAll(selector);
          if (headingElements.length > 0) {
            break;
          }
        }

        if (!headingElements || headingElements.length === 0) {
          setTimeout(addIdsToHeadings, 1000);
          return;
        }

        const headingArray = Array.from(headingElements);
        
        tocItems.forEach((tocItem) => {
          const matchingElement = headingArray.find(element => {
            const elementText = element.textContent?.trim() || '';
            return elementText === tocItem.originalText || 
                   elementText.includes(tocItem.originalText) ||
                   tocItem.originalText.includes(elementText);
          });

          if (matchingElement) {
            matchingElement.id = tocItem.id;
            matchingElement.style.scrollMarginTop = '120px';
            
            const index = headingArray.indexOf(matchingElement);
            if (index > -1) {
              headingArray.splice(index, 1);
            }
          }
        });

        // 按顺序匹配剩余的
        if (headingArray.length > 0) {
          tocItems.forEach((tocItem, index) => {
            if (!document.getElementById(tocItem.id) && headingArray[index]) {
              headingArray[index].id = tocItem.id;
              headingArray[index].style.scrollMarginTop = '120px';
            }
          });
        }
      }, 500);

      return () => clearTimeout(timer);
    };

    addIdsToHeadings();
  }, [tocItems]);

  // 监听滚动事件，高亮当前标题
  useEffect(() => {
    if (tocItems.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200; // 增加偏移量，让检测更准确
      let currentActiveId = '';

      // 从后往前检查，找到第一个在视窗上方的标题
      for (let i = tocItems.length - 1; i >= 0; i--) {
        const element = document.getElementById(tocItems[i].id);
        if (element) {
          const elementTop = element.offsetTop;
          
          if (scrollPosition >= elementTop) {
            currentActiveId = tocItems[i].id;
            break;
          }
        }
      }

      // 如果没有找到合适的标题，使用第一个
      if (!currentActiveId && tocItems.length > 0) {
        currentActiveId = tocItems[0].id;
      }

      if (currentActiveId !== activeId) {
        setActiveId(currentActiveId);
        if (currentActiveId) {
          scrollTocToActiveItem(currentActiveId);
        }
      }
    };

    let timeoutId: NodeJS.Timeout;
    const debouncedScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 50); // 增加防抖时间
    };

    window.addEventListener('scroll', debouncedScroll, { passive: true });
    // 延迟初始化执行，确保DOM完全加载
    setTimeout(handleScroll, 1500);

    return () => {
      window.removeEventListener('scroll', debouncedScroll);
      clearTimeout(timeoutId);
    };
  }, [tocItems, activeId]);

  // 滚动目录到活跃项
  const scrollTocToActiveItem = (activeItemId: string) => {
    // 使用requestAnimationFrame确保DOM更新完成后再执行
    requestAnimationFrame(() => {
      const activeButton = document.querySelector(`[data-toc-id="${activeItemId}"]`) as HTMLElement;
      const tocContainer = document.querySelector('.toc-nav-container') as HTMLElement;
      
      if (activeButton && tocContainer) {
        // 计算按钮相对于容器的位置
        const buttonTop = activeButton.offsetTop;
        const buttonHeight = activeButton.offsetHeight;
        const containerHeight = tocContainer.clientHeight;
        const scrollTop = tocContainer.scrollTop;
        
        // 检查按钮是否在可视区域内
        const isAboveView = buttonTop < scrollTop;
        const isBelowView = buttonTop + buttonHeight > scrollTop + containerHeight;
        
        if (isAboveView || isBelowView) {
          // 计算目标滚动位置，让活跃项居中显示
          const targetScrollTop = Math.max(0, buttonTop - containerHeight / 2 + buttonHeight / 2);
          
          tocContainer.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        }
      }
    });
  };

  const scrollToHeading = (id: string) => {
    let element = document.getElementById(id);
    
    if (!element) {
      const tocItem = tocItems.find(item => item.id === id);
      if (tocItem) {
        const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        element = Array.from(allHeadings).find(el => 
          el.textContent?.trim() === tocItem.originalText
        ) as HTMLElement;
        
        if (element) {
          element.id = id;
        }
      }
    }
    
    if (element) {
      const offsetTop = element.offsetTop - 120;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth',
      });
      
      setActiveId(id);
      
      setTimeout(() => {
        scrollTocToActiveItem(id);
      }, 100);
      
      element.style.backgroundColor = '#fef3c7';
      element.style.transition = 'background-color 0.3s ease';
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 1500);
    }
  };

  if (tocItems.length === 0) {
    return null;
  }

  return (
    <div className={`toc-sidebar ${className}`}>
      {/* 移动端切换按钮 */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="lg:hidden w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg mb-4 hover:bg-gray-50 transition-colors duration-200 shadow-sm"
      >
        <span className="font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          目录 ({tocItems.length})
        </span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isVisible ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 目录内容 */}
      <div className={`lg:block ${isVisible ? 'block' : 'hidden'}`}>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center text-sm uppercase tracking-wide">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              文章目录
              <span className="ml-2 text-xs font-normal text-gray-500">({tocItems.length})</span>
            </h3>
          </div>
          
          <nav className="p-2 max-h-[calc(100vh-180px)] overflow-y-auto toc-nav-container">
            {tocItems.map((item) => (
              <button
                key={item.id}
                data-toc-id={item.id}
                onClick={() => scrollToHeading(item.id)}
                className={`block w-full text-left px-3 py-2.5 rounded-md text-sm transition-all duration-200 mb-1 ${
                  activeId === item.id
                    ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-500 toc-item-active font-medium shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-l-3 border-transparent hover:border-gray-200'
                }`}
                style={{
                  paddingLeft: `${(item.level - 1) * 16 + 12}px`,
                }}
                title={item.text}
              >
                <span className="block leading-relaxed">{item.text}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
} 