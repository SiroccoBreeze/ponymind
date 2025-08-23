import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const isAuthPage = pathname.startsWith('/auth/');
    const isApiAuthRoute = pathname.startsWith('/api/auth/');
    const isAdminPage = pathname.startsWith('/admin');
    const isAdminApiRoute = pathname.startsWith('/api/admin/');
    const isRegisterPage = pathname === '/auth/register';

    // 跳过对 API 认证路由的处理
    if (isApiAuthRoute) {
      return NextResponse.next();
    }

    // 如果用户已登录且访问登录/注册页面，重定向到首页
    if (req.nextauth.token && isAuthPage) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // 注意：注册页面的访问控制现在在页面组件中动态处理
    // 这样可以实时响应系统参数的变化

    // 如果用户未登录且访问需要保护的页面（非认证页面），重定向到登录页
    if (!req.nextauth.token && !isAuthPage) {
      const signInUrl = new URL('/auth/signin', req.url);
      // 只有当访问的不是登录页面时才设置回调URL
      if (pathname !== '/auth/signin') {
        signInUrl.searchParams.set('callbackUrl', req.url);
      }
      return NextResponse.redirect(signInUrl);
    }

    // 管理页面和API的权限检查将在各自的组件和API中处理
    // 这里只检查用户是否已登录
    if ((isAdminPage || isAdminApiRoute) && !req.nextauth.token) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // 让中间件函数处理所有逻辑
    },
  }
);

// 配置需要保护的路由
export const config = {
  matcher: [
    /*
     * 匹配所有需要认证的路由:
     * - 首页 (/)
     * - 认证相关页面 (/auth/*)
     * - 管理页面 (/admin/*)
     * 但排除:
     * - API 路由 (/api/*)（除了管理API）
     * - 静态资源 (_next/static/*, _next/image/*)
     * - 图片等文件 (.*\\..*$)
     * - 公共资源 (public/*)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
 