import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import connectDB from '@/lib/mongodb';
import Image from '@/models/Image';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 等待params
    const { id } = await params;
    
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

    // 查找图片记录
    const imageRecord = await Image.findOne({
      _id: id,
      uploader: user._id
    });

    if (!imageRecord) {
      return NextResponse.json(
        { error: '图片不存在或无权删除' },
        { status: 404 }
      );
    }

    // 删除物理文件
    if (existsSync(imageRecord.path)) {
      try {
        await unlink(imageRecord.path);
      } catch (error) {
        console.error('删除物理文件失败:', error);
        // 即使物理文件删除失败，也继续删除数据库记录
      }
    }

    // 删除数据库记录
    await Image.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: '图片删除成功'
    });

  } catch (error) {
    console.error('删除图片失败:', error);
    return NextResponse.json(
      { error: '删除图片失败' },
      { status: 500 }
    );
  }
}

// 更新图片信息（如关联文章）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 等待params
    const { id } = await params;
    
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

    const { associatedPost, isUsed } = await request.json();

    // 验证权限
    const imageRecord = await Image.findOne({
      _id: id,
      uploader: user._id
    });

    if (!imageRecord) {
      return NextResponse.json(
        { error: '图片不存在或无权修改' },
        { status: 404 }
      );
    }

    // 更新图片信息
    const updatedImage = await Image.findByIdAndUpdate(
      id,
      {
        associatedPost,
        isUsed,
        updatedAt: new Date()
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      image: updatedImage,
      message: '图片信息更新成功'
    });

  } catch (error) {
    console.error('更新图片信息失败:', error);
    return NextResponse.json(
      { error: '更新图片信息失败' },
      { status: 500 }
    );
  }
} 