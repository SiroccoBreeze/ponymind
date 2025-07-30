import connectDB from './mongodb';
import Image from '@/models/Image';
import Comment from '@/models/Comment';
import Post from '@/models/Post';
import { deleteFromMinio } from './minio';
import { extractRelativePath } from './image-utils';

/**
 * 从markdown内容中提取图片URL
 */
export function extractImagesFromContent(content: string): string[] {
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

/**
 * 根据图片URL删除图片记录和物理文件
 */
export async function deleteImagesByUrls(imageUrls: string[]): Promise<void> {
  if (!imageUrls.length) return;
  
  try {
    await connectDB();
    
    for (const imageUrl of imageUrls) {
      try {
        // 提取相对路径
        const relativePath = extractRelativePath(imageUrl);
        
        // 查找图片记录
        const imageRecord = await Image.findOne({ 
          $or: [
            { url: imageUrl },
            { url: relativePath }
          ]
        });
        
        if (imageRecord) {
          // 删除MinIO中的文件
          if (imageRecord.storageType === 'minio' && imageRecord.objectName) {
            try {
              await deleteFromMinio(imageRecord.objectName);
              console.log(`已删除MinIO文件: ${imageRecord.objectName}`);
            } catch (error) {
              console.error(`删除MinIO文件失败: ${imageRecord.objectName}`, error);
            }
          }
          
          // 删除数据库记录
          await Image.findByIdAndDelete(imageRecord._id);
          console.log(`已删除图片记录: ${imageRecord.filename}`);
        }
      } catch (error) {
        console.error(`删除图片失败: ${imageUrl}`, error);
      }
    }
  } catch (error) {
    console.error('批量删除图片失败:', error);
  }
}

/**
 * 删除文章关联的图片
 */
export async function deletePostImages(postId: string): Promise<void> {
  try {
    await connectDB();
    
    // 查找文章关联的所有图片
    const images = await Image.find({ associatedPost: postId });
    
    for (const image of images) {
      try {
        // 删除MinIO中的文件
        if (image.storageType === 'minio' && image.objectName) {
          try {
            await deleteFromMinio(image.objectName);
            console.log(`已删除MinIO文件: ${image.objectName}`);
          } catch (error) {
            console.error(`删除MinIO文件失败: ${image.objectName}`, error);
          }
        }
        
        // 删除数据库记录
        await Image.findByIdAndDelete(image._id);
        console.log(`已删除图片记录: ${image.filename}`);
      } catch (error) {
        console.error(`删除图片失败: ${image.filename}`, error);
      }
    }
  } catch (error) {
    console.error('删除文章图片失败:', error);
  }
}

/**
 * 级联删除文章及其相关数据
 */
export async function deletePostWithCascade(postId: string): Promise<void> {
  try {
    await connectDB();
    
    // 删除文章关联的图片
    await deletePostImages(postId);
    
    // 删除文章的所有评论
    await Comment.deleteMany({ post: postId });
    
    // 删除文章本身
    await Post.findByIdAndDelete(postId);
    
    console.log(`已级联删除文章: ${postId}`);
  } catch (error) {
    console.error('级联删除文章失败:', error);
  }
}

/**
 * 清理未使用的图片
 */
export async function cleanupUnusedImages(): Promise<void> {
  try {
    await connectDB();
    
    // 查找所有未关联到文章的图片
    const unusedImages = await Image.find({
      associatedPost: null,
      isUsed: false
    });
    
    console.log(`找到 ${unusedImages.length} 张未使用的图片`);
    
    for (const image of unusedImages) {
      try {
        // 删除MinIO中的文件
        if (image.storageType === 'minio' && image.objectName) {
          try {
            await deleteFromMinio(image.objectName);
            console.log(`已删除MinIO文件: ${image.objectName}`);
          } catch (error) {
            console.error(`删除MinIO文件失败: ${image.objectName}`, error);
          }
        }
        
        // 删除数据库记录
        await Image.findByIdAndDelete(image._id);
        console.log(`已删除未使用图片记录: ${image.filename}`);
      } catch (error) {
        console.error(`删除未使用图片失败: ${image.filename}`, error);
      }
    }
  } catch (error) {
    console.error('清理未使用图片失败:', error);
  }
} 