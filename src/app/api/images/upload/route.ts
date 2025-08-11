import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import path from 'path';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Image from '@/models/Image';
import { uploadToMinio } from '@/lib/minio';

// 允许的文件类型
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES_PER_REQUEST = 50;

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录状态
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    await connectDB();

    // 查找用户信息以获取用户ID
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 解析表单数据
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const postId = formData.get('postId') as string; // 获取帖子ID（可选）
    const isComment = formData.get('isComment') === 'true'; // 获取是否为评论图片
    const originalAuthorId = formData.get('originalAuthorId') as string; // 获取原评论作者ID（管理端编辑时使用）

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '请选择要上传的图片' },
        { status: 400 }
      );
    }

    // 检查文件数量限制
    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `一次最多只能上传${MAX_FILES_PER_REQUEST}张图片` },
        { status: 400 }
      );
    }

    const uploadedImages = [];
    const errors = [];

    for (const file of files) {
      try {
        // 验证文件类型
        if (!ALLOWED_TYPES.includes(file.type)) {
          errors.push(`文件 ${file.name} 格式不支持，仅支持 JPG、PNG、GIF、WebP 格式`);
          continue;
        }

        // 验证文件大小
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`文件 ${file.name} 大小超过 5MB 限制`);
          continue;
        }

        // 生成唯一文件名
        const fileExt = path.extname(file.name);
        const fileName = `${crypto.randomUUID()}${fileExt}`;

        // 保存文件到MinIO，传递用户ID和帖子ID
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // 如果是管理端编辑评论，使用原评论作者的ID
        const uploadUserId = originalAuthorId || user._id.toString();
        const fileUrl = await uploadToMinio(buffer, fileName, file.type, undefined, uploadUserId, postId, false, isComment);

        // 生成对象名称
        let objectName: string;
        if (postId && isComment) {
          objectName = `images/${uploadUserId}/post/${postId}/comments/${fileName}`;
        } else if (postId) {
          objectName = `images/${uploadUserId}/post/${postId}/${fileName}`;
        } else {
          objectName = `images/${uploadUserId}/temp/${fileName}`;
        }

        // 保存到数据库，但标记为未确认
        const imageRecord = new Image({
          filename: fileName,
          originalName: file.name,
          mimetype: file.type,
          size: file.size,
          url: fileUrl,
          objectName: objectName,
          storageType: 'minio',
          uploader: originalAuthorId || user._id, // 使用原评论作者ID或当前用户ID
          associatedPost: postId || null,
          isUsed: false, // 标记为未确认使用
        });

        await imageRecord.save();

        uploadedImages.push({
          id: imageRecord._id,
          filename: fileName,
          originalName: file.name,
          url: fileUrl,
          size: file.size,
          isConfirmed: false, // 前端需要确认使用
        });

      } catch (error) {
        console.error(`上传文件 ${file.name} 失败:`, error);
        errors.push(`文件 ${file.name} 上传失败`);
      }
    }

    if (uploadedImages.length === 0) {
      return NextResponse.json(
        { error: '没有文件上传成功', details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `成功上传 ${uploadedImages.length} 张图片`,
      images: uploadedImages,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('图片上传失败:', error);
    return NextResponse.json(
      { error: '图片上传失败' },
      { status: 500 }
    );
  }
}

// 获取用户上传的图片列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    await connectDB();

    // 查找用户信息以获取用户ID
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const images = await Image.find({ uploader: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('filename originalName url size isUsed createdAt');

    const total = await Image.countDocuments({ uploader: user._id });

    return NextResponse.json({
      success: true,
      images,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('获取图片列表失败:', error);
    return NextResponse.json(
      { error: '获取图片列表失败' },
      { status: 500 }
    );
  }
} 