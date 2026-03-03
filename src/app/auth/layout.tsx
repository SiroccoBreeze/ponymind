'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { BrainCircuit } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSignIn = pathname === '/auth/signin';
  // null = 加载中（避免初始渲染时按钮闪现再消失）
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/system-parameters');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setRegistrationEnabled(data.parameters.allowRegistration !== false);
          } else {
            setRegistrationEnabled(true);
          }
        } else {
          setRegistrationEnabled(true);
        }
      } catch {
        setRegistrationEnabled(true);
      }
    };
    check();
  }, []);

  return (
    /*
     * Navbar 在 /auth/* 返回 null，但 root <main> 仍有 pt-[72px]。
     * mt-[-72px] 抵消该 padding，让 auth 布局从视窗顶部开始；
     * min-h-screen 确保填满整个视窗，flex items-center 实现真正垂直居中。
     * MASTER §2.2: from-accent (#EDE9FE) via-background (#F5F3FF) → 克制渐变不过曝
     */
    <div className="mt-[-72px] min-h-screen flex items-center justify-center bg-gradient-to-br from-accent via-background to-card relative overflow-hidden px-4 py-8">

      {/* 装饰性渐变光晕 — MASTER §1 AI Soft Glass，pointer-events-none 不影响交互 */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-40 -right-28 w-[560px] h-[560px] rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute -bottom-28 -left-40 w-[460px] h-[460px] rounded-full bg-secondary/[0.06] blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-primary/[0.03] blur-2xl" />
      </div>

      {/* 居中卡片容器 — max-w-md 防止过宽，MASTER §4 */}
      <div className="relative w-full max-w-md">

        {/* Logo — MASTER §8.5 font-heading text-primary */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2.5 mb-6 rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-transform duration-200 hover:-translate-y-0.5 w-fit mx-auto"
          aria-label="返回 PonyMind 首页"
        >
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm ring-1 ring-primary/20 flex-shrink-0">
            <BrainCircuit className="w-5 h-5 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <span className="font-heading font-bold text-2xl text-primary tracking-tight leading-none">
            PonyMind
          </span>
        </Link>

        {/* 毛玻璃卡片 — .glass-auth: blur(24px) saturate(180%) + micro glow */}
        <div className="glass-auth rounded-2xl p-8 md:p-10">

          {/* 卡片标题 — text-3xl font-heading per MASTER §3.2 */}
          <div className="mb-8 text-center">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
              {isSignIn ? '登录到你的账户' : '创建新账户'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignIn
                ? '欢迎回来，请输入你的邮箱和密码'
                : '填写以下信息，开始你的知识之旅'}
            </p>
          </div>

          {/* 表单插槽 — 由 signin/page 或 register/page 注入 */}
          {children}

          {/*
           * 注册 / 登录互导链接
           * - 登录页：仅当 registrationEnabled=true 时显示，关闭则完全不渲染
           * - 注册页：始终显示"已有账户？立即登录"
           */}
          {(isSignIn ? registrationEnabled === true : registrationEnabled !== null) && (
            <>
              <Separator className="my-6 opacity-30" />
              <p className="text-center text-sm text-muted-foreground">
                {isSignIn ? (
                  <>
                    还没有账户？{' '}
                    <Link
                      href="/auth/register"
                      className="text-primary hover:text-primary/80 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
                    >
                      立即注册
                    </Link>
                  </>
                ) : (
                  <>
                    已有账户？{' '}
                    <Link
                      href="/auth/signin"
                      className="text-primary hover:text-primary/80 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
                    >
                      立即登录
                    </Link>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
