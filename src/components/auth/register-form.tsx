'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock } from 'lucide-react';

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [checkingRegistration, setCheckingRegistration] = useState(true);

  // 检查用户注册功能是否启用
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await fetch('/api/system-parameters');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setRegistrationEnabled(data.parameters.allowRegistration !== false);
          }
        }
      } catch (error) {
        console.error('检查注册状态失败:', error);
        // 如果检查失败，默认允许注册
        setRegistrationEnabled(true);
      } finally {
        setCheckingRegistration(false);
      }
    };

    checkRegistrationStatus();
  }, []);

  // 如果注册功能已关闭，静默重定向到登录页面
  useEffect(() => {
    if (!checkingRegistration && !registrationEnabled) {
      router.replace('/auth/signin');
    }
  }, [checkingRegistration, registrationEnabled, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '注册失败');
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 如果正在检查注册状态，显示加载状态
  if (checkingRegistration) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">正在检查注册状态...</p>
        </div>
      </div>
    );
  }

  // 如果注册功能已关闭，显示加载状态
  if (!registrationEnabled) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">用户名</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="请输入用户名"
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="m@example.com"
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="请输入密码"
              required
              className="h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">确认密码</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="请再次输入密码"
              required
              className="h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? '注册中...' : '创建账户'}
        </Button>
      </form>

      <div className="text-center text-xs text-muted-foreground">
        <p>
          注册即表示您同意我们的{' '}
          <a href="#" className="underline underline-offset-4 hover:text-primary transition-colors">
            服务条款
          </a>
          {' '}和{' '}
          <a href="#" className="underline underline-offset-4 hover:text-primary transition-colors">
            隐私政策
          </a>
        </p>
      </div>
    </div>
  );
} 