'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AvatarUpload from '@/components/AvatarUpload';
import UserAvatar from '@/components/UserAvatar';
import { displayLocalTime } from '@/lib/frontend-time-utils';
import { Loader2, User, Mail, Calendar, MapPin, FileText, Globe } from 'lucide-react';

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
    if (session?.user) fetchUserProfile();
  }, [session, status, router]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch('/api/users/profile');
      if (res.ok) setUserProfile(await res.json());
    } catch (e) {
      console.error('获取用户资料失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (avatarUrl: string | undefined) => {
    setUserProfile((prev) => (prev ? { ...prev, avatar: avatarUrl } : null));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" strokeWidth={1.5} />
          <p className="text-sm">加载中…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 sm:p-8">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-8">用户资料</h1>

          {/* 头像管理 — MASTER §8.3 卡片 */}
          <section className="mb-8 p-6 bg-muted/50 rounded-xl border border-border" aria-labelledby="avatar-heading">
            <h2 id="avatar-heading" className="font-heading text-xl font-semibold text-foreground mb-4">
              头像管理
            </h2>
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex flex-col items-center">
                <h3 className="font-heading text-base font-medium text-foreground mb-4">当前头像</h3>
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
              <div className="flex-1">
                <h3 className="font-heading text-base font-medium text-foreground mb-4">上传新头像</h3>
                <AvatarUpload
                  currentAvatar={userProfile?.avatar}
                  userName={userProfile?.name || session?.user?.name || '用户'}
                  onAvatarChange={handleAvatarChange}
                />
              </div>
            </div>
          </section>

          {/* 用户信息 — MASTER §8.2 输入框 + label */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6" aria-labelledby="info-heading">
            <h2 id="info-heading" className="sr-only">
              基本信息
            </h2>

            <div className="space-y-1.5">
              <label htmlFor="profile-name" className="text-sm font-medium text-foreground block">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
                <input
                  id="profile-name"
                  type="text"
                  readOnly
                  value={userProfile?.name || session?.user?.name || ''}
                  className="w-full pl-10 pr-3 py-2.5 bg-muted/60 border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors duration-150 cursor-default"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-email" className="text-sm font-medium text-foreground block">
                邮箱
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
                <input
                  id="profile-email"
                  type="email"
                  readOnly
                  value={userProfile?.email || session?.user?.email || ''}
                  className="w-full pl-10 pr-3 py-2.5 bg-muted/60 border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors duration-150 cursor-default"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-joined" className="text-sm font-medium text-foreground block">
                加入时间
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
                <input
                  id="profile-joined"
                  type="text"
                  readOnly
                  value={
                    userProfile?.createdAt
                      ? displayLocalTime(userProfile.createdAt, 'datetime')
                      : displayLocalTime(new Date().toISOString(), 'datetime')
                  }
                  className="w-full pl-10 pr-3 py-2.5 bg-muted/60 border border-input rounded-lg text-foreground cursor-default"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-location" className="text-sm font-medium text-foreground block">
                位置
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
                <input
                  id="profile-location"
                  type="text"
                  readOnly
                  value={userProfile?.location || '未设置'}
                  className="w-full pl-10 pr-3 py-2.5 bg-muted/60 border border-input rounded-lg text-foreground cursor-default"
                />
              </div>
            </div>
          </section>

          <div className="mt-6 space-y-1.5">
            <label htmlFor="profile-bio" className="text-sm font-medium text-foreground block">
              个人简介
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
              <textarea
                id="profile-bio"
                rows={4}
                readOnly
                value={userProfile?.bio || '未设置个人简介'}
                className="w-full pl-10 pr-3 py-2.5 bg-muted/60 border border-input rounded-lg text-foreground resize-none cursor-default focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="mt-6 space-y-1.5">
            <label htmlFor="profile-website" className="text-sm font-medium text-foreground block">
              个人网站
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
              <input
                id="profile-website"
                type="url"
                readOnly
                value={userProfile?.website || '未设置'}
                className="w-full pl-10 pr-3 py-2.5 bg-muted/60 border border-input rounded-lg text-foreground cursor-default"
              />
            </div>
          </div>

          {/* 功能说明 — MASTER §8.3 卡片 */}
          <div className="mt-8 p-6 bg-muted/50 rounded-xl border border-border">
            <h3 className="font-heading text-base font-semibold text-foreground mb-4">头像上传说明</h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>支持 JPG、PNG、GIF、WebP 格式，最大 5MB</li>
              <li>支持拖拽上传和点击选择</li>
              <li>上传新头像时会自动删除旧头像</li>
              <li>头像存储在 MinIO 中，安全可靠</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
