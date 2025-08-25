'use client';

import { useSession } from 'next-auth/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Ban, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';

interface UserStatusCheckProps {
  children: React.ReactNode;
}

export default function UserStatusCheck({ children }: UserStatusCheckProps) {
  const { data: session, status } = useSession();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const userStatus = (session.user as any).status;
      if (userStatus && (userStatus === 'banned' || userStatus === 'inactive')) {
        setShowWarning(true);
      }
    }
  }, [session, status]);

  // 定期检查用户状态（每30秒检查一次）
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const checkUserStatus = async () => {
        try {
          const response = await fetch(`/api/test-user-status?email=${encodeURIComponent((session.user as any).email)}`);
          if (response.ok) {
            const data = await response.json();
            const currentStatus = data.user.status;
            
            // 如果状态变为已封禁或非活跃，立即显示警告
            if (currentStatus === 'banned' || currentStatus === 'inactive') {
              setShowWarning(true);
            }
          }
        } catch (error) {
          console.error('检查用户状态失败:', error);
        }
      };

      // 立即检查一次
      checkUserStatus();
      
      // 设置定期检查
      const interval = setInterval(checkUserStatus, 30000);
      
      return () => clearInterval(interval);
    }
  }, [session, status]);

  // 如果用户被封禁，显示封禁提示
  if (showWarning && (session?.user as any)?.status === 'banned') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <Ban className="h-4 w-4" />
          <AlertDescription className="text-center">
            <div className="font-semibold mb-2">账户已被封禁</div>
            <p className="text-sm">
              您的账户已被管理员封禁，无法访问系统功能。
              <br />
              如有疑问，请联系管理员。
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 如果用户处于非活跃状态，显示警告提示
  if (showWarning && (session?.user as any)?.status === 'inactive') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md border-yellow-200 bg-yellow-50 text-yellow-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-center">
            <div className="font-semibold mb-2">账户处于非活跃状态</div>
            <p className="text-sm">
              您的账户当前处于非活跃状态，部分功能可能受限。
              <br />
              请联系管理员激活账户。
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
