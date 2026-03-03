'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      setError('请输入邮箱和密码');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Error alert — MASTER §2.4 destructive semantic */}
      {error && (
        <Alert
          variant="destructive"
          className="border-destructive/40 bg-destructive/8 text-destructive rounded-xl py-3"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
          <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>

        {/* Email field */}
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-sm font-medium text-foreground"
          >
            邮箱
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="your@email.com"
            required
            autoComplete="email"
            inputMode="email"
            className={cn(
              'h-11 rounded-lg px-4',
              'bg-background/70 border-border',
              'focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary',
              'placeholder:text-muted-foreground/50',
              'transition-colors duration-150',
            )}
          />
        </div>

        {/* Password field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              密码
            </Label>
            {/* Forgot password — MASTER §2.1 text-primary */}
            <button
              type="button"
              className={cn(
                'text-xs text-primary hover:text-primary/80',
                'transition-colors duration-150 cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
              )}
            >
              忘记密码？
            </button>
          </div>

          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="请输入密码"
              required
              autoComplete="current-password"
              className={cn(
                'h-11 rounded-lg px-4 pr-11',
                'bg-background/70 border-border',
                'focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary',
                'placeholder:text-muted-foreground/50',
                'transition-colors duration-150',
              )}
            />
            {/* Eye toggle — MASTER §11 accessibility: aria-label + focus-visible */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                'text-muted-foreground hover:text-foreground',
                'transition-colors duration-150 cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
              )}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Eye className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {/* Submit — MASTER §8 button spec + §2.1 --primary-glow */}
        <Button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full h-11 text-base font-semibold rounded-xl mt-2',
            'cursor-pointer transition-all duration-200',
            'shadow-[0_4px_16px_rgba(99,102,241,0.25)]',
            'hover:shadow-[0_6px_24px_rgba(99,102,241,0.35)]',
            'hover:-translate-y-0.5',
            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none',
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              登录中…
            </span>
          ) : (
            '登录'
          )}
        </Button>
      </form>
    </div>
  );
}
