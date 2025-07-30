import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Image from '@/models/Image';
import User from '@/models/User';
import { deleteFromMinio, moveImageToPost } from '@/lib/minio';

// 删除单个图片
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

    await connectDB();
    
    const { id } = await params;

    // 查找用户信息
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 查找图片并验证权限
    const image = await Image.findById(id);
    
    if (!image) {
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
      );
    }

    // 检查权限：只有上传者可以删除
    if (image.uploader.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: '无权限删除此图片' },
        { status: 403 }
      );
    }

    // 删除MinIO中的文件
    if (image.storageType === 'minio' && image.objectName) {
      try {
        await deleteFromMinio(image.objectName);
        console.log(`✅ 已删除MinIO文件: ${image.objectName}`);
      } catch (error) {
        console.error(`❌ 删除MinIO文件失败: ${image.objectName}`, error);
        // 即使MinIO删除失败，也继续删除数据库记录
      }
    }

    // 删除数据库记录
    await Image.findByIdAndDelete(id);
    console.log(`✅ 已删除图片记录: ${image.filename}`);

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

// 移动图片到帖子目录
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json(
        { error: '帖子ID不能为空' },
        { status: 400 }
      );
    }

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

    // 如果图片已经在正确位置，直接更新数据库
    if (imageRecord.associatedPost?.toString() === postId) {
      return NextResponse.json({
        success: true,
        message: '图片已经关联到该帖子'
      });
    }

    // 移动MinIO中的文件
    try {
      const newUrl = await moveImageToPost(
        imageRecord.objectName!,
        user._id.toString(),
        postId,
        imageRecord.filename
      );

      // 更新数据库记录
      const newObjectName = `images/${user._id}/${postId}/${imageRecord.filename}`;
      const updatedImage = await Image.findByIdAndUpdate(
        id,
        {
          associatedPost: postId,
          isUsed: true,
          url: newUrl,
          objectName: newObjectName,
          updatedAt: new Date()
        },
        { new: true }
      );

      return NextResponse.json({
        success: true,
        image: updatedImage,
        message: '图片移动成功'
      });

    } catch (error) {
      console.error('移动图片失败:', error);
      return NextResponse.json(
        { error: '移动图片失败' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('处理图片移动失败:', error);
    return NextResponse.json(
      { error: '处理图片移动失败' },
      { status: 500 }
    );
  }
} 