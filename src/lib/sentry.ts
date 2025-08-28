import * as Sentry from '@sentry/nextjs';

// 初始化Sentry
export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      
      // 性能监控
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // 错误采样率
      replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0,
      
      // 环境配置
      environment: process.env.NODE_ENV || 'development',
      
      // 忽略某些错误
      ignoreErrors: [
        // 忽略一些常见的无害错误
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        'Network request failed',
        'Failed to fetch',
        // 忽略一些常见的第三方服务错误
        /chrome-extension/,
        /moz-extension/,
        /safari-extension/,
        /webkit-extension/,
      ],
    });
  }
}

// 设置用户上下文
export function setUserContext(user: { id: string; email: string; name?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

// 清除用户上下文
export function clearUserContext() {
  Sentry.setUser(null);
}

// 设置标签
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

// 设置额外上下文
export function setContext(name: string, context: Record<string, any>) {
  Sentry.setContext(name, context);
}

// 添加面包屑
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}

// 手动捕获异常
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

// 手动捕获消息
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

// 性能监控功能已在新版本中简化，如需使用请参考 Sentry 官方文档

// 导出Sentry实例
export { Sentry };
