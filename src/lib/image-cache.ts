// 图片缓存工具函数
export interface CachedImage {
  id: string;
  file: File;
  previewUrl: string;
  originalName: string;
  size: number;
  type: string;
}

// 存储缓存的图片
const imageCache = new Map<string, CachedImage>();

// 生成唯一ID
function generateImageId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 缓存图片文件
export function cacheImage(file: File): CachedImage {
  const id = generateImageId();
  const previewUrl = URL.createObjectURL(file);
  
  const cachedImage: CachedImage = {
    id,
    file,
    previewUrl,
    originalName: file.name,
    size: file.size,
    type: file.type,
  };
  
  imageCache.set(id, cachedImage);
  return cachedImage;
}

// 获取缓存的图片
export function getCachedImage(id: string): CachedImage | undefined {
  return imageCache.get(id);
}

// 删除缓存的图片
export function removeCachedImage(id: string): void {
  const cachedImage = imageCache.get(id);
  if (cachedImage) {
    URL.revokeObjectURL(cachedImage.previewUrl);
    imageCache.delete(id);
  }
}

// 清理所有缓存的图片
export function clearImageCache(): void {
  imageCache.forEach((cachedImage) => {
    URL.revokeObjectURL(cachedImage.previewUrl);
  });
  imageCache.clear();
}

// 批量删除缓存的图片
export function removeCachedImages(ids: string[]): void {
  ids.forEach((id) => {
    removeCachedImage(id);
  });
}

// 获取所有缓存的图片
export function getAllCachedImages(): CachedImage[] {
  return Array.from(imageCache.values());
}

// 上传缓存的图片到服务器
export async function uploadCachedImages(cachedImages: CachedImage[]): Promise<string[]> {
  const uploadPromises = cachedImages.map(async (cachedImage) => {
    const formData = new FormData();
    formData.append('images', cachedImage.file);
    
    try {
      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.images[0]?.url || '';
      } else {
        throw new Error(`上传失败: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`上传图片 ${cachedImage.originalName} 失败:`, error);
      throw error;
    }
  });
  
  try {
    const uploadedUrls = await Promise.all(uploadPromises);
    return uploadedUrls.filter(Boolean);
  } catch (error) {
    console.error('批量上传图片失败:', error);
    throw error;
  }
}

// 验证图片文件
export function validateImage(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `文件 ${file.name} 格式不支持，仅支持 JPG、PNG、GIF、WebP 格式`
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `文件 ${file.name} 大小超过 5MB 限制`
    };
  }
  
  return { valid: true };
} 