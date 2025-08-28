'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AvatarUpload from '@/components/AvatarUpload';
import UserAvatar from '@/components/UserAvatar';
import { displayLocalTime } from '@/lib/frontend-time-utils';

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/profile');
      return;
    }

    if (session?.user) {
      fetchUserProfile();
    }
  }, [session, status, router]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/users/profile');
      if (response.ok) {
        const profileData = await response.json();
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error('获取用户资料失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (avatarUrl: string | undefined) => {
    setUserProfile(prev => prev ? { ...prev, avatar: avatarUrl } : null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-card rounded-xl shadow-sm border border-border p-8">
          <h1 className="text-3xl font-bold text-foreground mb-8">用户资料</h1>
          
          {/* 头像上传演示 */}
          <div className="mb-8 p-6 bg-muted/50 rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">头像管理</h2>
            <div className="flex flex-col lg:flex-row gap-8">
              {/* 当前头像显示 */}
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-medium text-foreground mb-4">当前头像</h3>
                <UserAvatar 
                  avatar={userProfile?.avatar}
                  userName={userProfile?.name || session?.user?.name || '用户'}
                  size="xl"
                  className="mb-4"
                />
                <p className="text-sm text-muted-foreground text-center">
                  {userProfile?.avatar ? '已设置头像' : '未设置头像'}
                </p>
              </div>
              
              {/* 头像上传组件 */}
              <div className="flex-1">
                <h3 className="text-lg font-medium text-foreground mb-4">上传新头像</h3>
                <AvatarUpload
                  currentAvatar={userProfile?.avatar}
                  userName={userProfile?.name || session?.user?.name || '用户'}
                  onAvatarChange={handleAvatarChange}
                />
              </div>
            </div>
          </div>

          {/* 用户信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">用户名</label>
              <input
                type="text"
                value={userProfile?.name || session?.user?.name || ''}
                className="w-full px-3 py-2 border border-border rounded-lg bg-muted"
                readOnly
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">邮箱</label>
              <input
                type="email"
                value={userProfile?.email || session?.user?.email || ''}
                className="w-full px-3 py-2 border border-border rounded-lg bg-muted"
                readOnly
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">加入时间</label>
              <input
                type="text"
                value={userProfile?.createdAt 
                  ? displayLocalTime(userProfile.createdAt, 'datetime')
                  : displayLocalTime(new Date().toISOString(), 'datetime')
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-muted"
                readOnly
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">位置</label>
              <input
                type="text"
                value={userProfile?.location || '未设置'}
                className="w-full px-3 py-2 border border-border rounded-lg bg-muted"
                readOnly
              />
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-muted-foreground mb-2">个人简介</label>
            <textarea
              rows={4}
              value={userProfile?.bio || '未设置个人简介'}
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted"
              readOnly
            />
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-muted-foreground mb-2">个人网站</label>
            <input
              type="url"
              value={userProfile?.website || '未设置'}
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted"
              readOnly
            />
          </div>

          {/* 功能说明 */}
          <div className="mt-8 p-6 bg-muted rounded-lg">
            <h3 className="text-lg font-semibold text-foreground mb-4">头像上传功能说明</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• 支持 JPG、PNG、GIF、WebP 格式的图片</p>
              <p>• 文件大小限制：最大 5MB</p>
              <p>• 支持拖拽上传和点击选择</p>
              <p>• 上传新头像时会自动删除旧头像</p>
              <p>• 头像存储在 MinIO 中，安全可靠</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 