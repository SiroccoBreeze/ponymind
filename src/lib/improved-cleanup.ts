import connectDB from './mongodb';
import Image from '@/models/Image';
import Post from '@/models/Post';
import Comment from '@/models/Comment';
import User from '@/models/User';
import { deleteFromMinio } from './minio';

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
 * 改进的清理未使用图片函数
 */
export async function improvedCleanupUnusedImages(): Promise<{
  success: boolean;
  message: string;
  details: {
    totalImages: number;
    usedImages: number;
    unusedImages: number;
    deletedImages: number;
    skippedImages: number;
    errors: string[];
  };
}> {
  const errors: string[] = [];
  let deletedCount = 0;
  let skippedCount = 0;
  
  try {
    await connectDB();
    
    // 查找所有图片记录
    const allImages = await Image.find({});
    console.log(`检查 ${allImages.length} 张图片的使用情况`);
    
    // 查找所有文章和评论
    const allPosts = await Post.find({}, 'content');
    const allComments = await Comment.find({}, 'content images');
    const allUsers = await User.find({}, 'avatar');
    
    // 收集所有正在使用的图片URL
    const usedImageUrls = new Set<string>();
    
    // 从文章内容中提取
    for (const post of allPosts) {
      const imageUrls = extractImagesFromContent(post.content);
      imageUrls.forEach(url => usedImageUrls.add(url));
    }
    
    // 从评论内容和图片字段中提取
    for (const comment of allComments) {
      const imageUrls = extractImagesFromContent(comment.content);
      imageUrls.forEach(url => usedImageUrls.add(url));
      
      if (comment.images) {
        comment.images.forEach((url: string) => usedImageUrls.add(url));
      }
    }
    
    // 从用户头像中提取
    for (const user of allUsers) {
      if (user.avatar && user.avatar.startsWith('/api/images/')) {
        usedImageUrls.add(user.avatar);
      }
    }
    
    console.log(`找到 ${usedImageUrls.size} 个正在使用的图片URL`);
    
    // 找出未使用的图片
    const unusedImages = allImages.filter(image => {
      // 检查多种可能的URL格式
      const imageUrl = image.url;
      const objectNameUrl = image.objectName ? `/api/images/${image.objectName}` : null;
      
      // 如果图片被标记为已使用或有关联的文章，则认为是正在使用的
      if (image.isUsed || image.associatedPost) {
        return false;
      }
      
      // 检查URL是否在正在使用的图片列表中
      const isUsed = usedImageUrls.has(imageUrl) || (objectNameUrl && usedImageUrls.has(objectNameUrl));
      
      if (!isUsed) {
        console.log(`标记为未使用: ${image.filename} (URL: ${imageUrl})`);
      }
      
      return !isUsed;
    });
    
    console.log(`发现 ${unusedImages.length} 张未使用的图片`);
    
    // 删除未使用的图片
    for (const image of unusedImages) {
      try {
        // 额外的安全检查：再次确认图片确实未被使用
        const imageUrl = image.url;
        const objectNameUrl = image.objectName ? `/api/images/${image.objectName}` : null;
        
        const isActuallyUsed = usedImageUrls.has(imageUrl) || (objectNameUrl && usedImageUrls.has(objectNameUrl));
        
        if (isActuallyUsed) {
          console.log(`⚠️ 跳过正在使用的图片: ${image.filename}`);
          skippedCount++;
          continue;
        }
        
        // 删除MinIO中的文件
        if (image.storageType === 'minio' && image.objectName) {
          try {
            await deleteFromMinio(image.objectName);
            console.log(`✅ 已删除未使用的MinIO文件: ${image.objectName}`);
          } catch (error) {
            const errorMsg = `删除MinIO文件失败: ${image.objectName} - ${error}`;
            console.error(errorMsg);
            errors.push(errorMsg);
            continue; // 如果MinIO删除失败，跳过数据库删除
          }
        }
        
        // 删除数据库记录
        await Image.findByIdAndDelete(image._id);
        console.log(`✅ 已删除未使用的图片记录: ${image.filename}`);
        
        deletedCount++;
      } catch (error) {
        const errorMsg = `删除未使用图片失败: ${image.filename} - ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    console.log(`清理完成，删除了 ${deletedCount} 张未使用的图片，跳过了 ${skippedCount} 张图片`);
    
    return {
      success: true,
      message: `成功清理了 ${deletedCount} 张未使用的图片`,
      details: {
        totalImages: allImages.length,
        usedImages: allImages.length - unusedImages.length,
        unusedImages: unusedImages.length,
        deletedImages: deletedCount,
        skippedImages: skippedCount,
        errors
      }
    };
    
  } catch (error) {
    const errorMsg = `清理未使用图片失败: ${error}`;
    console.error(errorMsg);
    
    return {
      success: false,
      message: errorMsg,
      details: {
        totalImages: 0,
        usedImages: 0,
        unusedImages: 0,
        deletedImages: deletedCount,
        skippedImages: skippedCount,
        errors: [...errors, errorMsg]
      }
    };
  }
}

/**
 * 安全清理函数 - 只清理临时图片
 */
export async function safeCleanupTempImages(): Promise<{
  success: boolean;
  message: string;
  details: {
    totalTempImages: number;
    deletedImages: number;
    errors: string[];
  };
}> {
  const errors: string[] = [];
  let deletedCount = 0;
  
  try {
    await connectDB();
    
    // 只查找临时图片（在temp目录下的图片）
    const tempImages = await Image.find({
      objectName: { $regex: /\/temp\// },
      associatedPost: null,
      isUsed: false
    });
    
    console.log(`找到 ${tempImages.length} 张临时图片`);
    
    // 删除临时图片
    for (const image of tempImages) {
      try {
        // 删除MinIO中的文件
        if (image.storageType === 'minio' && image.objectName) {
          try {
            await deleteFromMinio(image.objectName);
            console.log(`✅ 已删除临时MinIO文件: ${image.objectName}`);
          } catch (error) {
            const errorMsg = `删除临时MinIO文件失败: ${image.objectName} - ${error}`;
            console.error(errorMsg);
            errors.push(errorMsg);
            continue;
          }
        }
        
        // 删除数据库记录
        await Image.findByIdAndDelete(image._id);
        console.log(`✅ 已删除临时图片记录: ${image.filename}`);
        
        deletedCount++;
      } catch (error) {
        const errorMsg = `删除临时图片失败: ${image.filename} - ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    return {
      success: true,
      message: `成功清理了 ${deletedCount} 张临时图片`,
      details: {
        totalTempImages: tempImages.length,
        deletedImages: deletedCount,
        errors
      }
    };
    
  } catch (error) {
    const errorMsg = `清理临时图片失败: ${error}`;
    console.error(errorMsg);
    
    return {
      success: false,
      message: errorMsg,
      details: {
        totalTempImages: 0,
        deletedImages: deletedCount,
        errors: [...errors, errorMsg]
      }
    };
  }
}

/**
 * 更新非活跃用户状态
 * 将半个月内没有登录的用户状态设置为非活跃
 */
export async function updateInactiveUsers(): Promise<{
  success: boolean;
  message: string;
  details: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    updatedUsers: number;
    errors: string[];
  };
}> {
  const startTime = Date.now();
  const errors: string[] = [];
  let updatedCount = 0;
  
  try {
    await connectDB();
    
    // 计算半个月前的时间（15天）
    const halfMonthAgo = new Date();
    halfMonthAgo.setDate(halfMonthAgo.getDate() - 15);
    
    console.log(`开始检查非活跃用户，截止时间: ${halfMonthAgo.toISOString()}`);
    
    // 查找所有用户
    const allUsers = await User.find({});
    console.log(`检查 ${allUsers.length} 个用户的活动状态`);
    
    // 统计当前状态
    const activeUsers = allUsers.filter(user => user.status === 'active').length;
    const inactiveUsers = allUsers.filter(user => user.status === 'inactive').length;
    
    // 查找需要更新的用户：状态为活跃且最后登录时间超过半个月
    const usersToUpdate = allUsers.filter(user => {
      // 只处理状态为活跃的用户
      if (user.status !== 'active') return false;
      
      // 如果没有最后登录时间，说明用户从未登录过
      // 检查用户创建时间是否超过半个月
      if (!user.lastLoginAt) {
        const isOldEnough = user.createdAt < halfMonthAgo;
        if (isOldEnough) {
          console.log(`用户 ${user.name} (${user.email}) 从未登录且创建时间超过半个月，将被标记为非活跃`);
        }
        return isOldEnough;
      }
      
      // 检查最后登录时间是否超过半个月
      const isInactive = user.lastLoginAt < halfMonthAgo;
      if (isInactive) {
        console.log(`用户 ${user.name} (${user.email}) 最后登录时间: ${user.lastLoginAt.toISOString()}，超过半个月，将被标记为非活跃`);
      }
      return isInactive;
    });
    
    console.log(`发现 ${usersToUpdate.length} 个需要更新为非活跃状态的用户`);
    
    // 批量更新用户状态
    for (const user of usersToUpdate) {
      try {
        await User.findByIdAndUpdate(user._id, {
          status: 'inactive',
          updatedAt: new Date()
        });
        
        console.log(`✅ 已更新用户状态为非活跃: ${user.name} (${user.email})`);
        updatedCount++;
        
      } catch (error) {
        const errorMsg = `更新用户状态失败: ${user.name} (${user.email}) - ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`非活跃用户状态更新完成，更新了 ${updatedCount} 个用户，耗时 ${duration}ms`);
    
    return {
      success: true,
      message: `成功更新了 ${updatedCount} 个非活跃用户状态`,
      details: {
        totalUsers: allUsers.length,
        activeUsers: activeUsers - updatedCount, // 减去已更新的用户
        inactiveUsers: inactiveUsers + updatedCount, // 加上新更新的用户
        updatedUsers: updatedCount,
        errors
      }
    };
    
  } catch (error) {
    const errorMsg = `更新非活跃用户状态失败: ${error}`;
    console.error(errorMsg);
    
    return {
      success: false,
      message: errorMsg,
      details: {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        updatedUsers: 0,
        errors: [errorMsg]
      }
    };
  }
} 