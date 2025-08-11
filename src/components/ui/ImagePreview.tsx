'use client';

import React, { useState, useEffect, memo } from 'react';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showModal?: boolean;
  onModalToggle?: (show: boolean) => void;
}

const ImagePreview = memo(({ 
  src, 
  alt, 
  className = '', 
  size = 'md',
  showModal: externalShowModal,
  onModalToggle 
}: ImagePreviewProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [internalShowModal, setInternalShowModal] = useState(false);
  
  // 使用外部控制或内部状态
  const showModal = externalShowModal !== undefined ? externalShowModal : internalShowModal;
  const setShowModal = (show: boolean) => {
    if (externalShowModal !== undefined) {
      onModalToggle?.(show);
    } else {
      setInternalShowModal(show);
    }
  };

  // 重置状态当 src 改变时
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  // 尺寸映射
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };

  if (error) {
    return (
      <div className={`${sizeClasses[size]} bg-muted border border-border rounded flex items-center justify-center ${className}`}>
        <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
    );
  }

  return (
    <>
      <div className={`relative group ${className}`}>
        {/* 加载占位符 */}
        {!loaded && !error && (
          <div className={`${sizeClasses[size]} bg-muted rounded border border-border flex items-center justify-center animate-pulse`}>
            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" />
            </svg>
          </div>
        )}
        
        {/* 主图片 */}
        <img
          src={src}
          alt={alt || '图片'}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          onClick={() => {
            if (loaded) {
              setShowModal(true);
            }
          }}
          className={`${sizeClasses[size]} object-cover rounded border border-border transition-all duration-300 ${
            loaded 
              ? 'opacity-100 cursor-zoom-in hover:scale-105 hover:shadow-md' 
              : 'opacity-0 pointer-events-none absolute top-0 left-0'
          }`}
          loading="lazy"
        />
        
        {/* 图片描述提示 */}
        {alt && loaded && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b truncate opacity-0 group-hover:opacity-100 transition-opacity">
            {alt}
          </div>
        )}
      </div>

      {/* 图片预览模态框 */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center">
            {/* 关闭按钮 */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute -top-5 right-0 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2 transition-colors"
              title="关闭"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* 大图 */}
            <img
              src={src}
              alt={alt || '图片'}
              className="rounded-lg transition-opacity duration-300 max-w-[80vw] max-h-[80vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* 图片描述 */}
            {alt && (
              <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center">
                <span className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded max-w-md">
                  {alt}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});

ImagePreview.displayName = 'ImagePreview';

export default ImagePreview; 