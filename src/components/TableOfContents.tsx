'use client';

import { useState, useEffect } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
}

export default function TableOfContents({ content, className = '' }: TableOfContentsProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // 解析标题
    const headings = parseHeadings(content);
    setToc(headings);
  }, [content]);

  useEffect(() => {
    // 监听滚动事件，高亮当前标题
    const handleScroll = () => {
      const headingElements = toc.map(item => 
        document.getElementById(item.id)
      ).filter(Boolean);

      let currentActiveId = '';
      
      for (let i = headingElements.length - 1; i >= 0; i--) {
        const element = headingElements[i];
        if (element && element.offsetTop <= window.scrollY + 100) {
          currentActiveId = element.id;
          break;
        }
      }
      
      setActiveId(currentActiveId);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [toc]);

  const parseHeadings = (text: string): TocItem[] => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: TocItem[] = [];
    let match;

    while ((match = headingRegex.exec(text)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = generateId(text);
      
      headings.push({
        id,
        text,
        level
      });
    }

    return headings;
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

  if (toc.length === 0) {
    return null;
  }

  return (
    <nav className={`toc-navigation ${className}`}>
      <div className="text-sm font-medium text-gray-900 mb-4">目录</div>
      <div className="space-y-0">
        {toc.map((item, index) => (
          <button
            key={index}
            onClick={() => scrollToHeading(item.id)}
            className={`block w-full text-left py-1.5 text-sm transition-colors duration-150 hover:text-gray-900 cursor-pointer ${
              activeId === item.id 
                ? 'text-blue-600 font-medium' 
                : 'text-gray-600'
            }`}
            style={{
              paddingLeft: `${(item.level - 1) * 16}px`
            }}
            title={item.text}
          >
            <span className="block truncate leading-5">
              {item.text}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
} 