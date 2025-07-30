'use client';

import { useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AvatarUploadProps {
  currentAvatar?: string;
  userName: string;
  onAvatarChange?: (avatarUrl: string | undefined) => void;
  className?: string;
}

export default function AvatarUpload({ 
  currentAvatar, 
  userName, 
  onAvatarChange,
  className = '' 
}: AvatarUploadProps) {
  const { data: session } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileSelect = useCallback((file: File) => {
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('只支持 JPG、PNG、GIF、WebP 格式的图片');
      return;
    }

    // 验证文件大小（5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('头像文件大小不能超过 5MB');
      return;
    }

    // 创建预览URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  // 处理文件输入变化
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 处理拖拽
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 上传头像
  const uploadAvatar = async (file: File) => {
    if (!session?.user?.email) {
      toast.error('请先登录');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '上传失败');
      }

      const result = await response.json();
      
      // 清理预览URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      // 调用回调函数
      if (onAvatarChange) {
        onAvatarChange(result.avatarUrl);
      }

      // 触发全局头像变化事件
      window.dispatchEvent(new CustomEvent('avatar-changed'));

      toast.success('头像上传成功');
      
      // 清除文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('上传头像失败:', error);
      toast.error(error instanceof Error ? error.message : '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  // 删除头像
  const deleteAvatar = async () => {
    if (!session?.user?.email) {
      toast.error('请先登录');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/users/avatar', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '删除失败');
      }

      // 调用回调函数
      if (onAvatarChange) {
        onAvatarChange(undefined);
      }

      // 触发全局头像变化事件
      window.dispatchEvent(new CustomEvent('avatar-changed'));

      toast.success('头像删除成功');
    } catch (error) {
      console.error('删除头像失败:', error);
      toast.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  // 确认上传
  const confirmUpload = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      uploadAvatar(file);
    }
  };

  // 取消上传
  const cancelUpload = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 获取显示的头像URL
  const displayAvatar = previewUrl || currentAvatar;

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* 头像显示区域 */}
      <div className="relative group">
        <Avatar className="w-24 h-24 border-4 border-gray-200 hover:border-blue-300 transition-colors">
          <AvatarImage 
            src={displayAvatar || undefined} 
            alt={`${userName}的头像`}
            className="object-cover"
          />
          <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* 上传覆盖层 */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="text-white text-sm font-medium">更换头像</span>
        </div>
      </div>

      {/* 文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* 操作按钮 */}
      <div className="flex space-x-2">
        {previewUrl && (
          <>
            <Button
              onClick={confirmUpload}
              disabled={isUploading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUploading ? '上传中...' : '确认上传'}
            </Button>
            <Button
              onClick={cancelUpload}
              variant="outline"
              disabled={isUploading}
            >
              取消
            </Button>
          </>
        )}
        
        {currentAvatar && !previewUrl && (
          <Button
            onClick={deleteAvatar}
            disabled={isDeleting}
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            {isDeleting ? '删除中...' : '删除头像'}
          </Button>
        )}
      </div>

      {/* 上传进度提示 */}
      {isUploading && (
        <div className="text-sm text-blue-600">
          正在上传头像，请稍候...
        </div>
      )}
    </div>
  );
} 