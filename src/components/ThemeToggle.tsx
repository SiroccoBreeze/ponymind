'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Moon, Sun, Palette, Circle } from 'lucide-react';
import { useTheme } from 'next-themes';

const themes = [
  { name: 'light', label: '浅色', icon: Sun },
  { name: 'dark', label: '深色', icon: Moon },
  { name: 'system', label: '系统', icon: Palette },
];

const colorThemes = [
  { name: 'default', label: '默认', color: 'hsl(0 0% 9%)' },
  { name: 'red', label: '红色', color: 'hsl(0 84% 60%)' },
  { name: 'rose', label: '玫瑰', color: 'hsl(346 77% 50%)' },
  { name: 'orange', label: '橙色', color: 'hsl(24 95% 53%)' },
  { name: 'green', label: '绿色', color: 'hsl(142 76% 36%)' },
  { name: 'blue', label: '蓝色', color: 'hsl(221 83% 53%)' },
  { name: 'yellow', label: '黄色', color: 'hsl(48 96% 53%)' },
  { name: 'violet', label: '紫色', color: 'hsl(262 83% 58%)' },
];

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [currentColorTheme, setCurrentColorTheme] = useState('default');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    // 从localStorage读取保存的颜色主题
    const savedColorTheme = localStorage.getItem('color-theme') || 'default';
    setCurrentColorTheme(savedColorTheme);
    document.documentElement.setAttribute('data-theme', savedColorTheme);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const currentTheme = themes.find(t => t.name === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  const handleThemeChange = (themeName: string) => {
    setTheme(themeName);
  };

  const handleColorThemeChange = (colorTheme: string) => {
    // 设置data-theme属性到html元素
    document.documentElement.setAttribute('data-theme', colorTheme);
    // 保存到localStorage以实现持久化
    localStorage.setItem('color-theme', colorTheme);
    setCurrentColorTheme(colorTheme);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <CurrentIcon className="h-4 w-4" />
          <span className="sr-only">切换主题</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* 主题模式 */}
        <div className="px-2 py-1.5 text-sm font-semibold">主题模式</div>
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          return (
            <DropdownMenuItem
              key={themeOption.name}
              onClick={() => handleThemeChange(themeOption.name)}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              <span>{themeOption.label}</span>
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        
        {/* 颜色主题 */}
        <div className="px-2 py-1.5 text-sm font-semibold">颜色主题</div>
        <div className="grid grid-cols-4 gap-1 p-2">
          {colorThemes.map((colorTheme) => (
            <Button
              key={colorTheme.name}
              variant={currentColorTheme === colorTheme.name ? "default" : "ghost"}
              size="sm"
              className={`h-8 w-8 p-0 ${currentColorTheme === colorTheme.name ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
              onClick={() => handleColorThemeChange(colorTheme.name)}
              title={colorTheme.label}
            >
              <Circle 
                className="h-4 w-4" 
                style={{ color: colorTheme.color }}
                fill={colorTheme.color}
              />
              {currentColorTheme === colorTheme.name && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full"></div>
                </div>
              )}
            </Button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 