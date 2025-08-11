import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import Image from '@/models/Image';
import { deletePostWithCascade } from '@/lib/cascade-delete';
import { deleteFromMinio } from '@/lib/minio';
import { extractImagesFromContent } from '@/lib/cascade-delete';
import { moveImageToPost } from '@/lib/minio';
import { updateImageLinksInContent } from '@/lib/image-utils';

// 获取单个文章
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;
    const post = await Post.findById(id).populate('author', 'name email avatar');

    if (!post) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    // 权限控制：未审核通过的文章只能作者和管理员查看
    if (post.reviewStatus !== 'published') {
      const session = await getServerSession();
      
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: '内容审核中，请登录后查看' },
          { status: 403 }
        );
      }

      // 查找用户信息
      const user = await User.findOne({ email: session.user.email });
      
      // 检查是否是作者或管理员
      const isAuthor = post.author.email === session.user.email;
      const isAdmin = user?.role === 'admin';
      
      if (!isAuthor && !isAdmin) {
        return NextResponse.json(
          { error: '无权限查看此内容' },
          { status: 403 }
        );
      }
    }

    // 增加浏览量（只有已发布的内容才增加浏览量）
    if (post.reviewStatus === 'published') {
      await Post.findByIdAndUpdate(id, { $inc: { views: 1 } });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('获取文章失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 更新文章
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const { id } = await params;
    const { 
      title, 
      content, 
      tags, 
      difficulty, 
      bounty, 
      reviewStatus, 
      questionDetails
    } = await request.json();

    // 验证必填字段
    if (!title?.trim()) {
      return NextResponse.json(
        { error: '标题不能为空' },
        { status: 400 }
      );
    }

    // 查找文章并验证权限
    const post = await Post.findById(id).populate('author', 'name email avatar');
    
    if (!post) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    // 检查权限：只有作者可以编辑
    if (post.author.email !== session.user.email) {
      return NextResponse.json(
        { error: '无权限编辑此文章' },
        { status: 403 }
      );
    }

    // 查找用户信息
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {
      title: title.trim(),
      content: content?.trim() || '',
      summary: content?.trim().substring(0, 200) + '...' || '',
      tags: tags || [],
      updatedAt: new Date(),
    };

    // 如果是问题类型，更新相关字段
    if (post.type === 'question') {
      if (difficulty) updateData.difficulty = difficulty;
      if (bounty !== undefined) updateData.bounty = Math.max(0, bounty);
      if (questionDetails) updateData.questionDetails = questionDetails;
    }

    // 处理审核状态
    if (reviewStatus) {
      updateData.reviewStatus = reviewStatus;
    }

    // 处理图片：从文章内容中提取实际使用的图片
    try {
      // 从文章内容中提取图片URL
      const imageUrls = extractImagesFromContent(content);
      console.log(`从文章内容中提取到 ${imageUrls.length} 张图片链接`);

      // 查找所有关联到该文章的图片
      const associatedImages = await Image.find({
        associatedPost: id,
        uploader: user._id
      });
      
      console.log(`找到 ${associatedImages.length} 张已关联的图片`);
      
      // 创建已关联图片的URL映射（包括temp路径和文章路径）
      const associatedImageUrls = new Set();
      associatedImages.forEach(image => {
        // 添加当前路径
        associatedImageUrls.add(`/api/images/${image.objectName}`);
        // 如果是文章路径，也添加对应的temp路径（用于匹配）
        if (image.objectName.includes(`/${id}/`)) {
          const tempPath = image.objectName.replace(`/${id}/`, '/temp/');
          associatedImageUrls.add(`/api/images/${tempPath}`);
        }
        // 如果是temp路径，也添加对应的文章路径（用于匹配）
        if (image.objectName.includes('/temp/')) {
          const postPath = image.objectName.replace('/temp/', `/${id}/`);
          associatedImageUrls.add(`/api/images/${postPath}`);
        }
      });
      
      console.log('已关联图片的URL映射:', Array.from(associatedImageUrls));
      
      // 找出需要删除的图片（在数据库中但不在文章内容中）
      const imagesToDelete = associatedImages.filter(image => {
        const currentImageUrl = `/api/images/${image.objectName}`;
        const tempImageUrl = image.objectName.includes(`/${id}/`) 
          ? `/api/images/${image.objectName.replace(`/${id}/`, '/temp/')}`
          : currentImageUrl;
        const postImageUrl = image.objectName.includes('/temp/')
          ? `/api/images/${image.objectName.replace('/temp/', `/${id}/`)}`
          : currentImageUrl;
        
        // 检查文章内容中是否包含这个图片的任何可能路径
        const isUsed = imageUrls.some(url => 
          url === currentImageUrl || url === tempImageUrl || url === postImageUrl
        );
        
        console.log(`图片 ${image.filename}: 当前路径=${currentImageUrl}, 是否使用=${isUsed}`);
        
        return !isUsed;
      });
      
      console.log(`删除 ${imagesToDelete.length} 张已删除的图片`);
      
      // 删除已删除的图片
      for (const imageToDelete of imagesToDelete) {
        try {
          // 删除MinIO中的文件
          if (imageToDelete.storageType === 'minio' && imageToDelete.objectName) {
            await deleteFromMinio(imageToDelete.objectName);
            console.log(`✅ 已删除MinIO文件: ${imageToDelete.objectName}`);
          }
          
          // 删除数据库记录
          await Image.findByIdAndDelete(imageToDelete._id);
          console.log(`✅ 已删除图片记录: ${imageToDelete.filename}`);
        } catch (error) {
          console.error(`❌ 删除图片失败: ${imageToDelete.filename}`, error);
        }
      }
      
      // 查找用户的所有临时图片
      const allTempImages = await Image.find({
        uploader: user._id,
        associatedPost: null,
        objectName: { $regex: /\/temp\// }
      });
      
      console.log(`找到 ${allTempImages.length} 张临时图片`);
      
      // 找出未使用的临时图片（不在文章内容中的图片）
      const unusedTempImages = allTempImages.filter(image => {
        const imageUrl = `/api/images/${image.objectName}`;
        return !imageUrls.includes(imageUrl);
      });
      
      console.log(`删除 ${unusedTempImages.length} 张未使用的临时图片`);
      
      // 删除未使用的临时图片
      for (const unusedImage of unusedTempImages) {
        try {
          // 删除MinIO中的文件
          if (unusedImage.storageType === 'minio' && unusedImage.objectName) {
            await deleteFromMinio(unusedImage.objectName);
            console.log(`✅ 已删除未使用的MinIO文件: ${unusedImage.objectName}`);
          }
          
          // 删除数据库记录
          await Image.findByIdAndDelete(unusedImage._id);
          console.log(`✅ 已删除未使用的图片记录: ${unusedImage.filename}`);
        } catch (error) {
          console.error(`❌ 删除未使用图片失败: ${unusedImage.filename}`, error);
        }
      }
      
      // 将实际使用的临时图片关联到文章
      const usedTempImages = allTempImages.filter(image => {
        const imageUrl = `/api/images/${image.objectName}`;
        return imageUrls.includes(imageUrl);
      });
      
      console.log(`关联 ${usedTempImages.length} 张使用的临时图片到文章`);
      
      // 移动图片文件并更新数据库记录
      for (const usedImage of usedTempImages) {
        try {
          // 移动MinIO中的文件从temp目录到文章目录
          await moveImageToPost(
            usedImage.objectName,
            user._id.toString(),
            id,
            usedImage.filename
          );

          // 更新数据库记录
          const newObjectName = `images/${user._id}/post/${id}/${usedImage.filename}`;
          await Image.findByIdAndUpdate(usedImage._id, {
            associatedPost: id,
            isUsed: true,
            url: `/api/images/${newObjectName}`,
            objectName: newObjectName,
            updatedAt: new Date()
          });
          
          console.log(`✅ 临时图片已移动到文章: ${usedImage.filename}`);
        } catch (error) {
          console.error(`❌ 移动临时图片失败: ${usedImage.filename}`, error);
        }
      }
      
      // 更新文章内容中的图片链接
      if (usedTempImages.length > 0) {
        const updatedContent = updateImageLinksInContent(
          content, 
          user._id.toString(), 
          id, 
          usedTempImages
        );
        
        // 如果内容有更新，使用更新后的内容
        if (updatedContent !== content) {
          // 更新构建数据中的内容
          updateData.content = updatedContent;
          updateData.summary = updatedContent.substring(0, 200) + '...';
          console.log(`✅ 文章内容已更新，图片链接已修正`);
        }
      }
      
    } catch (error) {
      console.error('❌ 处理图片失败:', error);
      // 图片处理失败不影响文章更新
    }

    // 更新文章
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('author', 'name email avatar');

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error('更新文章失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 删除文章
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const { id } = await params;

    // 查找文章并验证权限
    const post = await Post.findById(id).populate('author', 'name email avatar');
    
    if (!post) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    // 检查权限：只有作者可以删除自己的文章
    if (post.author.email !== session.user.email) {
      return NextResponse.json(
        { error: '无权限删除此文章' },
        { status: 403 }
      );
    }

    // 使用级联删除功能删除文章及其相关的图片和评论
    await deletePostWithCascade(id);

    return NextResponse.json({
      success: true,
      message: '删除成功'
    });

  } catch (error) {
    console.error('删除文章失败:', error);
    return NextResponse.json(
      { error: '删除失败' },
      { status: 500 }
    );
  }
} 