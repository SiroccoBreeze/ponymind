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
    <>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        {/* 动态背景装饰 */}
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        {/* 网格背景 */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221.5%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>

        <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full space-y-8">
            {/* 品牌标识 */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-400 to-blue-500 rounded-2xl shadow-lg mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L3 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.734.99A.996.996 0 0118 6v2a1 1 0 11-2 0v-.277l-1.254.145a1 1 0 11-.992-1.736L14.984 6l-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736L3 15.152l-1.254.716a1 1 0 11-.992-1.736L2 13.42V12a1 1 0 011-1zm14 0a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736L17 15.152l-1.254.716a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 4.504a1 1 0 01.372-1.364L9 13.848l1.254.716a1 1 0 11-.992 1.736L8 15.58v1.42a1 1 0 11-2 0v-2c0-.35.18-.676.382-.876z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                Pony<span className="text-purple-300">Mind</span>
              </h1>
              <p className="text-lg text-purple-200">知识分享社区</p>
            </div>
            
            {/* 主要内容卡片 */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 space-y-6">
              {/* 标题和切换链接 */}
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-white">
                  {isSignIn ? '欢迎回来' : '加入我们'}
                </h2>
                <p className="text-purple-200">
                  {isSignIn ? (
                    <>
                      还没有账户？{' '}
                      <Link
                        href="/auth/register"
                        className="font-semibold text-purple-300 hover:text-white transition-colors duration-200 hover:underline"
                      >
                        立即注册
                      </Link>
                    </>
                  ) : (
                    <>
                      已有账户？{' '}
                      <Link
                        href="/auth/signin"
                        className="font-semibold text-purple-300 hover:text-white transition-colors duration-200 hover:underline"
                      >
                        立即登录
                      </Link>
                    </>
                  )}
                </p>
              </div>

              {/* 表单内容 */}
              <div className="space-y-6">{children}</div>
            </div>

            {/* 底部信息 */}
            <div className="text-center text-purple-300 text-sm">
              <p>© 2024 PonyMind. 让知识连接世界</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </>
  );
} 