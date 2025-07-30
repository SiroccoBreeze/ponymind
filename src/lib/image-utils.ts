/**
 * 图片URL处理工具函数
 * 用于在数据库中存储相对路径，在前端显示时构建完整URL
 */

/**
 * 构建完整的图片访问URL
 * @param relativePath 数据库中存储的相对路径 (如: /api/images/images/userId/postId/filename.jpg)
 * @param baseUrl 可选的基础URL，默认使用环境变量或当前域名
 * @returns 完整的图片访问URL
 */
export function buildImageUrl(relativePath: string, baseUrl?: string): string {
  if (!relativePath) {
    return '';
  }

  // 如果已经是完整URL，直接返回
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  // 确保相对路径以 / 开头
  const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  
  // 使用提供的baseUrl或从环境变量获取
  const base = baseUrl || process.env.NEXTAUTH_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  
  return `${base}${normalizedPath}`;
}

/**
 * 从完整URL中提取相对路径
 * @param fullUrl 完整的图片URL
 * @returns 相对路径
 */
export function extractRelativePath(fullUrl: string): string {
  if (!fullUrl) {
    return '';
  }

  try {
    const url = new URL(fullUrl);
    return url.pathname;
  } catch {
    // 如果不是有效URL，尝试直接提取路径部分
    if (fullUrl.startsWith('/')) {
      return fullUrl;
    }
    return '';
  }
}

/**
 * 验证图片URL格式
 * @param url 图片URL
 * @returns 是否为有效的图片URL
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  // 检查是否为相对路径格式
  if (url.startsWith('/api/images/')) {
    return true;
  }

  // 检查是否为完整URL格式
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.startsWith('/api/images/');
  } catch {
    return false;
  }
}

/**
 * 获取图片文件名
 * @param url 图片URL
 * @returns 文件名
 */
export function getImageFilename(url: string): string {
  if (!url) {
    return '';
  }

  const path = extractRelativePath(url);
  const parts = path.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * 获取图片对象名称（用于MinIO操作）
 * @param url 图片URL
 * @returns MinIO对象名称
 */
export function getImageObjectName(url: string): string {
  if (!url) {
    return '';
  }

  const path = extractRelativePath(url);
  const apiPrefix = '/api/images/';
  
  if (path.startsWith(apiPrefix)) {
    return path.substring(apiPrefix.length);
  }
  
  return '';
}

/**
 * 检查是否为临时图片
 * @param url 图片URL
 * @returns 是否为临时图片
 */
export function isTempImage(url: string): boolean {
  const objectName = getImageObjectName(url);
  return objectName.includes('/temp/');
}

/**
 * 检查是否为文章图片
 * @param url 图片URL
 * @returns 是否为文章图片
 */
export function isPostImage(url: string): boolean {
  const objectName = getImageObjectName(url);
  return objectName.includes('/images/') && !objectName.includes('/temp/');
} 

/**
 * 更新文章内容中的图片链接
 * 将temp路径的图片链接更新为文章路径
 * @param content 文章内容
 * @param userId 用户ID
 * @param postId 文章ID
 * @param tempImages 临时图片列表
 * @returns 更新后的内容
 */
export function updateImageLinksInContent(
  content: string, 
  userId: string, 
  postId: string, 
  tempImages: Array<{ objectName: string; filename: string }>
): string {
  let updatedContent = content;
  
  for (const image of tempImages) {
    const oldImageUrl = `/api/images/${image.objectName}`;
    const newImageUrl = `/api/images/images/${userId}/${postId}/${image.filename}`;
    
    // 使用正则表达式安全地替换图片链接
    const escapedOldUrl = oldImageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    updatedContent = updatedContent.replace(new RegExp(escapedOldUrl, 'g'), newImageUrl);
  }
  
  return updatedContent;
}

/**
 * 从markdown内容中提取图片URL
 * @param content markdown内容
 * @returns 图片URL数组
 */
export function extractImageUrlsFromContent(content: string): string[] {
  const imageUrls: string[] = [];
  
  // 匹配markdown图片语法: ![alt](url)
  const markdownImageRegex = /!\[.*?\]\(([^)]+)\)/g;
  let match;
  
  while ((match = markdownImageRegex.exec(content)) !== null) {
    const imageUrl = match[1];
    // 处理API格式的图片URL
    if (imageUrl.startsWith('/api/images/') || imageUrl.includes('/api/images/')) {
      imageUrls.push(imageUrl);
    }
  }
  
  // 匹配HTML img标签: <img src="url">
  const htmlImageRegex = /<img[^>]+src="([^"]+)"/g;
  
  while ((match = htmlImageRegex.exec(content)) !== null) {
    const imageUrl = match[1];
    // 处理API格式的图片URL
    if (imageUrl.startsWith('/api/images/') || imageUrl.includes('/api/images/')) {
      imageUrls.push(imageUrl);
    }
  }
  
  return [...new Set(imageUrls)]; // 去重
} 