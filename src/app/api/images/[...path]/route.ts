import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Image from '@/models/Image';
import User, { IUser } from '@/models/User';
import { getObject } from '@/lib/minio';

// 定义图片记录的类型
interface IImage {
  _id: any;
  filename: string;
  objectName: string;
  uploader: any;
  associatedPost?: any;
  mimetype?: string;
}

// 检查图片访问权限
async function checkImageAccess(image: IImage, user: IUser): Promise<{ allowed: boolean; reason: string }> {
  // 管理员可以访问所有图片
  if (user.role === 'admin') {
    return { allowed: true, reason: '管理员权限' };
  }
  
  // 图片上传者可以访问自己的图片
  if (image.uploader.toString() === (user._id as any).toString()) {
    return { allowed: true, reason: '图片所有者' };
  }
  
  // 特殊处理：头像图片 - 允许所有用户访问头像（头像通常是公开的）
  if (image.objectName && image.objectName.includes('/avatar/')) {
    return { allowed: true, reason: '公开头像' };
  }
  
  // 如果图片关联到文章，文章作者可以访问
  if (image.associatedPost) {
    const Post = (await import('@/models/Post')).default;
    const post = await Post.findById(image.associatedPost).populate('author', 'email');
    if (post && post.author.email === user.email) {
      return { allowed: true, reason: '文章作者' };
    }
  }
  
  return { allowed: false, reason: '无权限访问' };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const imagePath = path.join('/');

    console.log(`🔍 请求图片: ${imagePath}`);
    
    // 验证会话
    const session = await getServerSession();
    if (!session?.user?.email) {
      console.log('❌ 未认证用户访问图片');
      return NextResponse.json(
        { error: '需要登录才能访问图片' },
        { status: 401 }
      );
    }

    await connectDB();
      
      // 查找图片记录
    const image = await Image.findOne({ objectName: imagePath });
    if (!image) {
      console.log(`❌ 图片记录不存在: ${imagePath}`);
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
      );
    }

    console.log(`📋 找到图片记录:`, {
      id: image._id,
      filename: image.filename,
      objectName: image.objectName,
      uploader: image.uploader,
      associatedPost: image.associatedPost,
      isAvatar: image.objectName?.includes('/avatar/')
    });

    // 查找用户
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      console.log('❌ 用户信息未找到');
        return NextResponse.json(
        { error: '用户信息未找到' },
          { status: 404 }
        );
      }
    
    console.log(`👤 当前用户:`, {
      id: user._id,
      email: user.email,
      role: user.role
    });
    
    // 检查访问权限
    const { allowed, reason } = await checkImageAccess(image, user);
    console.log(`🔍 权限检查结果:`, {
      allowed,
      reason,
      imageUploader: image.uploader.toString(),
      currentUser: (user._id as any).toString(),
      uploaderMatch: image.uploader.toString() === (user._id as any).toString()
    });
    if (!allowed) {
      console.log(`❌ 图片访问被拒绝: ${reason}`);
      console.log(`🔍 权限检查详情:`, {
        imageUploader: image.uploader.toString(),
        currentUser: (user._id as any).toString(),
        isAvatar: image.objectName?.includes('/avatar/'),
        avatarPathMatch: image.objectName?.match(/images\/([^\/]+)\/avatar\//)?.[1]
      });
      return NextResponse.json(
        { error: '无权限访问此图片' },
        { status: 403 }
      );
    }
    
    // 从MinIO获取图片
    try {
      const imageBuffer = await getObject(image.objectName);
      
      // 设置缓存头
      const headers = new Headers();
      headers.set('Content-Type', image.mimetype || 'image/jpeg');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1年缓存
      headers.set('Content-Length', imageBuffer.length.toString());
      
      console.log(`✅ 图片访问成功: ${image.filename} (通过API, 权限: ${reason}, 用户: ${session.user.email})`);
      
      return new NextResponse(imageBuffer, {
        status: 200,
        headers
      });
    } catch (error) {
      console.error(`❌ 从MinIO获取图片失败: ${imagePath}`, error);
      return NextResponse.json(
        { error: '图片获取失败' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ 图片访问失败:', error);
    return NextResponse.json(
      { error: '图片访问失败' },
      { status: 500 }
    );
  }
} 