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
      {/* 主按钮 */}
      <div className="relative group">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group-hover:scale-110"
          title="添加内容"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* 下拉菜单 */}
        {dropdownOpen && (
          <div className="absolute bottom-16 right-0 mb-2 w-48 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
            <div className="py-1">
              <button
                onClick={handleCreateArticle}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-accent transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-foreground">写文章</div>
                  <div className="text-xs text-muted-foreground">分享技术文章和经验</div>
                </div>
              </button>
              
              <button
                onClick={handleCreateQuestion}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-accent transition-colors"
              >
                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
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
