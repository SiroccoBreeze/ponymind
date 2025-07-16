import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import connectDB from './mongodb';
import Image from '@/models/Image';
import Comment from '@/models/Comment';
import Post from '@/models/Post';

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
    // 只处理本站上传的图片 (以 /uploads/images/ 开头)
    if (imageUrl.startsWith('/uploads/images/')) {
      imageUrls.push(imageUrl);
    }
  }
  
  // 匹配HTML img标签: <img src="url">
  const htmlImageRegex = /<img[^>]+src="([^"]+)"/g;
  
  while ((match = htmlImageRegex.exec(content)) !== null) {
    const imageUrl = match[1];
    // 只处理本站上传的图片
    if (imageUrl.startsWith('/uploads/images/')) {
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
        // 查找图片记录
        const imageRecord = await Image.findOne({ url: imageUrl });
        
        if (imageRecord) {
          // 删除物理文件
          if (existsSync(imageRecord.path)) {
            try {
              await unlink(imageRecord.path);
              console.log(`已删除物理文件: ${imageRecord.path}`);
            } catch (error) {
              console.error(`删除物理文件失败: ${imageRecord.path}`, error);
            }
          }
          
          // 删除数据库记录
          await Image.findByIdAndDelete(imageRecord._id);
          console.log(`已删除图片记录: ${imageUrl}`);
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
 * 级联删除文章及其所有相关数据
 */
export async function deletePostWithCascade(postId: string): Promise<void> {
  try {
    await connectDB();
    
    // 查找文章
    const post = await Post.findById(postId);
    if (!post) {
      console.log(`文章不存在: ${postId}`);
      return;
    }
    
    console.log(`开始级联删除文章: ${postId}`);
    
    // 1. 收集文章内容中的图片URL
    const postImageUrls = extractImagesFromContent(post.content);
    console.log(`文章内容中的图片: ${postImageUrls.length} 张`);
    
    // 2. 查找所有相关评论
    const comments = await Comment.find({ post: postId });
    console.log(`找到相关评论: ${comments.length} 条`);
    
    // 3. 收集评论中的图片URL
    const commentImageUrls: string[] = [];
    for (const comment of comments) {
      if (comment.images && comment.images.length > 0) {
        commentImageUrls.push(...comment.images);
      }
      
      // 从评论内容中提取图片URL
      const contentImages = extractImagesFromContent(comment.content);
      commentImageUrls.push(...contentImages);
    }
    
    console.log(`评论中的图片: ${commentImageUrls.length} 张`);
    
    // 4. 合并所有图片URL并去重
    const allImageUrls = [...new Set([...postImageUrls, ...commentImageUrls])];
    console.log(`总共需要删除的图片: ${allImageUrls.length} 张`);
    
    // 5. 删除所有图片
    await deleteImagesByUrls(allImageUrls);
    
    // 6. 删除所有评论
    await Comment.deleteMany({ post: postId });
    console.log(`已删除评论: ${comments.length} 条`);
    
    // 7. 删除关联的图片记录（通过associatedPost字段）
    const associatedImages = await Image.find({ associatedPost: postId });
    for (const image of associatedImages) {
      try {
        // 删除物理文件
        if (existsSync(image.path)) {
          await unlink(image.path);
          console.log(`已删除关联的物理文件: ${image.path}`);
        }
        
        // 删除数据库记录
        await Image.findByIdAndDelete(image._id);
        console.log(`已删除关联的图片记录: ${image.url}`);
      } catch (error) {
        console.error(`删除关联图片失败: ${image.url}`, error);
      }
    }
    
    // 8. 最后删除文章
    await Post.findByIdAndDelete(postId);
    console.log(`已删除文章: ${postId}`);
    
    console.log(`级联删除完成: ${postId}`);
    
  } catch (error) {
    console.error('级联删除失败:', error);
    throw error;
  }
}

/**
 * 清理未使用的图片（可选的维护功能）
 */
export async function cleanupUnusedImages(): Promise<void> {
  try {
    await connectDB();
    
    // 查找所有图片记录
    const allImages = await Image.find({});
    console.log(`检查 ${allImages.length} 张图片的使用情况`);
    
    // 查找所有文章和评论
    const allPosts = await Post.find({}, 'content');
    const allComments = await Comment.find({}, 'content images');
    
    // 收集所有正在使用的图片URL
    const usedImageUrls = new Set<string>();
    
    // 从文章内容中提取
    for (const post of allPosts) {
      const imageUrls = extractImagesFromContent(post.content);
      imageUrls.forEach((url: string) => usedImageUrls.add(url));
    }
    
    // 从评论内容和图片字段中提取
    for (const comment of allComments) {
      const imageUrls = extractImagesFromContent(comment.content);
      imageUrls.forEach((url: string) => usedImageUrls.add(url));
      
      if (comment.images) {
        comment.images.forEach((url: string) => usedImageUrls.add(url));
      }
    }
    
    // 找出未使用的图片
    const unusedImages = allImages.filter(image => !usedImageUrls.has(image.url));
    console.log(`发现 ${unusedImages.length} 张未使用的图片`);
    
    // 删除未使用的图片
    for (const image of unusedImages) {
      try {
        // 删除物理文件
        if (existsSync(image.path)) {
          await unlink(image.path);
          console.log(`已删除未使用的物理文件: ${image.path}`);
        }
        
        // 删除数据库记录
        await Image.findByIdAndDelete(image._id);
        console.log(`已删除未使用的图片记录: ${image.url}`);
      } catch (error) {
        console.error(`删除未使用图片失败: ${image.url}`, error);
      }
    }
    
    console.log(`清理完成，删除了 ${unusedImages.length} 张未使用的图片`);
    
  } catch (error) {
    console.error('清理未使用图片失败:', error);
    throw error;
  }
} 