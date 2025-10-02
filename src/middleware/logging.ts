import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export function loggingMiddleware(
  request: NextRequest,
  next: () => Promise<NextResponse>
) {
  const startTime = Date.now();
  const { pathname, search } = new URL(request.url);
  const method = request.method;
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';

  // 记录请求开始
  logger.api('API请求开始', {
    method,
    path: pathname + search,
    ip,
    userAgent,
    timestamp: new Date().toISOString()
  });

  return next().then((response) => {
    const duration = Date.now() - startTime;
    const statusCode = response.status;

    // 记录请求完成
    logger.api('API请求完成', {
      method,
      path: pathname + search,
      statusCode,
      duration,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });

    // 如果是错误状态码，记录错误日志
    if (statusCode >= 400) {
      logger.error('API请求失败', new Error(`API请求失败: ${method} ${pathname} - ${statusCode}`), {
        method,
        path: pathname + search,
        statusCode,
        duration,
        ip,
        userAgent
      });
    }

    return response;
  }).catch((error) => {
    const duration = Date.now() - startTime;
    
    // 记录请求错误
    logger.error('API请求异常', error, {
      method,
      path: pathname + search,
      duration,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });

    // 错误已通过logger.error记录

    throw error;
  });
}
