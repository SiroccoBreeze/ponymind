'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit3, HelpCircle } from 'lucide-react';

interface FloatingAddButtonProps {
  onCreateArticle: () => void;
  onCreateQuestion: () => void;
  className?: string;
}

export default function FloatingAddButton({
  onCreateArticle,
  onCreateQuestion,
  className = ''
}: FloatingAddButtonProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // 点击外部区域关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (dropdownOpen && !target.closest('.floating-add-button-container')) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleCreateArticle = () => {
    setDropdownOpen(false);
    onCreateArticle();
  };

  const handleCreateQuestion = () => {
    setDropdownOpen(false);
    onCreateQuestion();
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 floating-add-button-container ${className}`}>
      <div className="relative group">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-label="添加内容"
          aria-expanded={dropdownOpen}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-[0_0_20px_rgba(58,127,245,0.35)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          title="添加内容"
        >
          <Plus className="w-6 h-6" strokeWidth={1.5} />
        </button>

        {dropdownOpen && (
          <div className="absolute bottom-16 right-0 mb-2 w-48 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="py-1">
              <button
                type="button"
                onClick={handleCreateArticle}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Edit3 className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground">写文章</div>
                  <div className="text-xs text-muted-foreground">分享技术文章和经验</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleCreateQuestion}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <div className="w-8 h-8 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground">提问题</div>
                  <div className="text-xs text-muted-foreground">寻求帮助和解答</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
