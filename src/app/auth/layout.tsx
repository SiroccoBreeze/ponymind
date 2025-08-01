'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSignIn = pathname === '/auth/signin';

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* 左侧表单区域 */}
      <div className="relative flex flex-col p-8">
        {/* 品牌标识 - 左上角 */}
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L3 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.734.99A.996.996 0 0118 6v2a1 1 0 11-2 0v-.277l-1.254.145a1 1 0 11-.992-1.736L14.984 6l-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736L3 15.152l-1.254.716a1 1 0 11-.992-1.736L2 13.42V12a1 1 0 011-1zm14 0a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736L17 15.152l-1.254.716a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 4.504a1 1 0 01.372-1.364L9 13.848l1.254.716a1 1 0 11-.992 1.736L8 15.58v1.42a1 1 0 11-2 0v-2c0-.35.18-.676.382-.876z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-xl font-semibold">PonyMind</span>
        </div>

        {/* 主要内容 - 居中 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm space-y-8">
            {/* 主要内容 */}
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {isSignIn ? '登录到您的账户' : '创建新账户'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isSignIn 
                  ? '请输入您的邮箱和密码登录账户' 
                  : '请输入您的信息创建账户'
                }
              </p>
            </div>

            {/* 表单内容 */}
            {children}

            {/* 底部链接 */}
            <div className="text-center text-sm text-muted-foreground">
              {isSignIn ? (
                <>
                  <span>还没有账户？</span>
                  <Link
                    href="/auth/register"
                    className="underline underline-offset-4 hover:text-primary transition-colors"
                  >
                    立即注册
                  </Link>
                </>
              ) : (
                <>
                  <span>已有账户？</span>
                  <Link
                    href="/auth/signin"
                    className="underline underline-offset-4 hover:text-primary transition-colors"
                  >
                    立即登录
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 右侧装饰区域 - 类似图片中的设计 */}
      <div className="hidden lg:block bg-muted relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-br from-muted-foreground/5 to-muted-foreground/10"></div>
        
        {/* 文字内容 - 左上角 */}
        <div className="absolute top-12 left-12 max-w-sm">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Knowledge Sharing Community
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Where everyone can find answers and share wisdom.
            </p>
          </div>
        </div>
        
        {/* 主要装饰元素 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* 外圈 */}
            <div className="w-96 h-96 rounded-full bg-muted-foreground/5 border border-muted-foreground/10 flex items-center justify-center">
              {/* 中圈 */}
              <div className="w-80 h-80 rounded-full bg-muted-foreground/3 border border-muted-foreground/8 flex items-center justify-center">
                {/* 内圈 */}
                <div className="w-64 h-64 rounded-full bg-muted-foreground/8 border border-muted-foreground/15 flex items-center justify-center">
                  {/* 中心图标 */}
                  <div className="w-32 h-32 rounded-full bg-muted-foreground/10 border border-muted-foreground/20 flex items-center justify-center">
                    <svg className="w-16 h-16 text-muted-foreground/40" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L3 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.734.99A.996.996 0 0118 6v2a1 1 0 11-2 0v-.277l-1.254.145a1 1 0 11-.992-1.736L14.984 6l-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736L3 15.152l-1.254.716a1 1 0 11-.992-1.736L2 13.42V12a1 1 0 011-1zm14 0a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736L17 15.152l-1.254.716a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 4.504a1 1 0 01.372-1.364L9 13.848l1.254.716a1 1 0 11-.992 1.736L8 15.58v1.42a1 1 0 11-2 0v-2c0-.35.18-.676.382-.876z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 装饰性小圆点 */}
            <div className="absolute top-10 left-10 w-4 h-4 rounded-full bg-muted-foreground/20"></div>
            <div className="absolute top-20 right-16 w-3 h-3 rounded-full bg-muted-foreground/15"></div>
            <div className="absolute bottom-16 left-20 w-2 h-2 rounded-full bg-muted-foreground/25"></div>
            <div className="absolute bottom-24 right-12 w-3 h-3 rounded-full bg-muted-foreground/20"></div>
            
            {/* 装饰性线条 */}
            <div className="absolute top-1/4 left-0 w-16 h-px bg-gradient-to-r from-transparent to-muted-foreground/10"></div>
            <div className="absolute bottom-1/4 right-0 w-16 h-px bg-gradient-to-l from-transparent to-muted-foreground/10"></div>
            <div className="absolute left-1/4 top-0 w-px h-16 bg-gradient-to-b from-transparent to-muted-foreground/10"></div>
            <div className="absolute right-1/4 bottom-0 w-px h-16 bg-gradient-to-t from-transparent to-muted-foreground/10"></div>
          </div>
        </div>

        {/* 底部装饰文字 */}
        <div className="absolute bottom-12 right-12 text-right">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground/60 font-medium tracking-wide">
              JOIN OUR COMMUNITY
            </div>
            <div className="text-xs text-muted-foreground/40">
              Share • Learn • Grow
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 