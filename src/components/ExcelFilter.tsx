'use client';

import { useState, useRef, useEffect } from 'react';

interface ExcelFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedValues: string[]) => void;
  onClear: () => void;
  options: Array<{ value: string; label: string; count: number }>;
  title: string;
  position: { x: number; y: number };
}

export default function ExcelFilter({
  isOpen,
  onClose,
  onApply,
  onClear,
  options,
  title,
  position
}: ExcelFilterProps) {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'count'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterVisibleToAll, setFilterVisibleToAll] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedValues(options.map(opt => opt.value));
    }
  }, [isOpen, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const filteredOptions = options
    .filter(option => 
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.label.localeCompare(b.label)
          : b.label.localeCompare(a.label);
      } else {
        return sortOrder === 'asc' 
          ? a.count - b.count
          : b.count - a.count;
      }
    });

  const handleSelectAll = () => {
    setSelectedValues(options.map(opt => opt.value));
  };

  const handleInvertSelection = () => {
    setSelectedValues(options.filter(opt => !selectedValues.includes(opt.value)).map(opt => opt.value));
  };

  const handleSelectUnique = () => {
    const uniqueValues = options.filter(opt => opt.count === 1).map(opt => opt.value);
    setSelectedValues(uniqueValues);
  };

  const handleSelectDuplicates = () => {
    const duplicateValues = options.filter(opt => opt.count > 1).map(opt => opt.value);
    setSelectedValues(duplicateValues);
  };

  const handleToggleOption = (value: string) => {
    setSelectedValues(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleApply = () => {
    onApply(selectedValues);
    onClose();
  };

  const handleClear = () => {
    onClear();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl border border-gray-200 w-80 max-h-96 overflow-hidden"
        style={{
          position: 'absolute',
          top: position.y,
          left: position.x,
          transform: 'translateX(-50%)'
        }}
      >
        {/* 标题栏 */}
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">{title} 筛选</h3>
        </div>

        {/* 排序选项 */}
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={() => setSortOrder('asc')}
              className={`px-2 py-1 text-xs rounded ${
                sortOrder === 'asc' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              升序
            </button>
            <button
              onClick={() => setSortOrder('desc')}
              className={`px-2 py-1 text-xs rounded ${
                sortOrder === 'desc' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              降序
            </button>
          </div>
        </div>

        {/* 筛选类型标签 */}
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="flex space-x-4">
            <button className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1">
              按选项
            </button>
            <button className="text-sm text-gray-500 hover:text-gray-700">
              按颜色
            </button>
            <button className="text-sm text-gray-500 hover:text-gray-700">
              按条件
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜包含任一关键字,空格分隔"
              className="w-full pl-8 pr-16 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
              <button
                onClick={() => setSortBy('name')}
                className={`text-xs px-1 py-0.5 rounded ${
                  sortBy === 'name' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'
                }`}
              >
                名称{sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => setSortBy('count')}
                className={`text-xs px-1 py-0.5 rounded ${
                  sortBy === 'count' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'
                }`}
              >
                计数{sortBy === 'count' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
        </div>

        {/* 选项列表 */}
        <div className="max-h-48 overflow-y-auto">
          {/* 全选和操作按钮 */}
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={selectedValues.length === options.length}
                  onChange={handleSelectAll}
                  className="mr-2"
                />
                全选({options.length})
              </label>
              <div className="flex space-x-2 text-xs">
                <button onClick={handleInvertSelection} className="text-blue-600 hover:text-blue-800">
                  反选
                </button>
                <button onClick={handleSelectDuplicates} className="text-blue-600 hover:text-blue-800">
                  重复项
                </button>
                <button onClick={handleSelectUnique} className="text-blue-600 hover:text-blue-800">
                  唯一项
                </button>
              </div>
            </div>
          </div>

          {/* 选项列表 */}
          <div className="px-4 py-2">
            {filteredOptions.map((option) => (
              <label key={option.value} className="flex items-center justify-between py-1 hover:bg-gray-50">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    onChange={() => handleToggleOption(option.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">{option.label}</span>
                </div>
                <span className="text-xs text-gray-500">({option.count})</span>
              </label>
            ))}
          </div>
        </div>

        {/* 底部设置和按钮 */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center text-sm text-gray-700">
              筛选对所有人可见
              <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </label>
            <input
              type="checkbox"
              checked={filterVisibleToAll}
              onChange={(e) => setFilterVisibleToAll(e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex justify-between">
            <div className="flex space-x-2">
              <button
                onClick={handleClear}
                className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
                清除筛选
              </button>
              <button className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                导出
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 