/**
 * IP地址获取工具
 * 处理各种代理服务器和本地开发环境的IP地址获取
 */

export interface IPInfo {
  ip: string;
  source: string;
  isLocal: boolean;
  isProxy: boolean;
}

/**
 * 从请求头中获取真实IP地址
 * @param headers 请求头
 * @returns IP信息对象
 */
export function getClientIP(headers: Headers): IPInfo {
  // 尝试多种方式获取真实IP地址
  const cfConnectingIP = headers.get('cf-connecting-ip'); // Cloudflare
  const realIP = headers.get('x-real-ip'); // Nginx
  const forwarded = headers.get('x-forwarded-for'); // 标准代理头
  const xClientIP = headers.get('x-client-ip'); // 自定义客户端IP
  const xForwarded = headers.get('x-forwarded'); // 其他代理头
  
  // 调试信息
  const allHeaders = {
    cfConnectingIP,
    realIP,
    forwarded,
    xClientIP,
    xForwarded
  };
  
  console.log('🔍 IP地址调试信息:', allHeaders);
  
  let ip = 'unknown';
  let source = 'unknown';
  let isLocal = false;
  let isProxy = false;
  
  // 优先使用可信的IP地址
  if (cfConnectingIP) {
    ip = cfConnectingIP;
    source = 'cf-connecting-ip';
    isProxy = true;
  } else if (realIP) {
    ip = realIP;
    source = 'x-real-ip';
    isProxy = true;
  } else if (forwarded) {
    // x-forwarded-for可能包含多个IP，取第一个
    ip = forwarded.split(',')[0].trim();
    source = 'x-forwarded-for';
    isProxy = true;
  } else if (xClientIP) {
    ip = xClientIP;
    source = 'x-client-ip';
    isProxy = true;
  } else {
    // 如果都是本地地址，使用时间戳+随机数作为唯一标识
    ip = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    source = 'generated';
    isLocal = true;
    console.log('⚠️ 使用本地地址，生成唯一标识:', ip);
  }
  
  // 检查是否为本地地址
  if (!isLocal) {
    isLocal = isLocalIP(ip);
  }
  
  return {
    ip,
    source,
    isLocal,
    isProxy
  };
}

/**
 * 检查IP地址是否为本地地址
 * @param ip IP地址
 * @returns 是否为本地地址
 */
function isLocalIP(ip: string): boolean {
  if (!ip || ip === 'unknown') return true;
  
  // 检查常见的本地地址
  const localPatterns = [
    /^::1$/,                    // IPv6 本地回环
    /^127\.\d+\.\d+\.\d+$/,    // IPv4 本地回环
    /^10\.\d+\.\d+\.\d+$/,     // IPv4 私有网络
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // IPv4 私有网络
    /^192\.168\.\d+\.\d+$/,    // IPv4 私有网络
    /^169\.254\.\d+\.\d+$/,    // IPv4 链路本地
    /^fc00:/,                   // IPv6 唯一本地地址
    /^fe80:/                    // IPv6 链路本地地址
  ];
  
  return localPatterns.some(pattern => pattern.test(ip));
}

/**
 * 生成唯一的本地标识符
 * @param prefix 前缀
 * @returns 唯一标识符
 */
export function generateLocalIdentifier(prefix: string = 'local'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取IP地址的详细信息
 * @param headers 请求头
 * @returns 详细的IP信息
 */
export function getDetailedIPInfo(headers: Headers): {
  clientIP: IPInfo;
  allHeaders: Record<string, string | null>;
  recommendations: string[];
} {
  const clientIP = getClientIP(headers);
  const allHeaders = {
    'cf-connecting-ip': headers.get('cf-connecting-ip'),
    'x-real-ip': headers.get('x-real-ip'),
    'x-forwarded-for': headers.get('x-forwarded-for'),
    'x-client-ip': headers.get('x-client-ip'),
    'x-forwarded': headers.get('x-forwarded'),
    'user-agent': headers.get('user-agent'),
    'host': headers.get('host')
  };
  
  const recommendations: string[] = [];
  
  if (clientIP.isLocal) {
    recommendations.push('检测到本地地址，建议在生产环境中配置代理服务器');
  }
  
  if (!clientIP.isProxy) {
    recommendations.push('未检测到代理头，可能直接访问或代理配置不当');
  }
  
  if (clientIP.source === 'generated') {
    recommendations.push('使用生成的唯一标识，仅适用于本地开发环境');
  }
  
  return {
    clientIP,
    allHeaders,
    recommendations
  };
}
