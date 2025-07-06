import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Image from '@/models/Image';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function DELETE(request: NextRequest) {
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

    const { imageUrls } = await request.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: '请提供要删除的图片URL列表' },
        { status: 400 }
      );
    }

    const deletedImages = [];
    const errors = [];

    for (const imageUrl of imageUrls) {
      try {
        // 查找图片记录
        const imageRecord = await Image.findOne({ 
          url: imageUrl, 
          uploader: user._id 
        });

        if (!imageRecord) {
          errors.push(`图片 ${imageUrl} 不存在或无权限删除`);
          continue;
        }

        // 删除物理文件
        const filePath = path.join(process.cwd(), 'public', imageUrl);
        if (existsSync(filePath)) {
          await unlink(filePath);
        }

        // 删除数据库记录
        await Image.findByIdAndDelete(imageRecord._id);

        deletedImages.push(imageUrl);
      } catch (error) {
        console.error(`删除图片 ${imageUrl} 失败:`, error);
        errors.push(`删除图片 ${imageUrl} 失败`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功删除 ${deletedImages.length} 张图片`,
      deletedImages,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('批量删除图片失败:', error);
    return NextResponse.json(
      { error: '批量删除图片失败' },
      { status: 500 }
    );
  }
} 