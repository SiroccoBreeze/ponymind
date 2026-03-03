import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: '登录',
  description: '登录到你的 PonyMind 账户，继续你的知识之旅。',
};

export default function SignInPage() {
  return <LoginForm />;
}
