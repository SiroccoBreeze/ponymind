import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Image from '@/models/Image';
import User from '@/models/User';
import { deleteFromMinio } from '@/lib/minio';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    await connectDB();

    // 查找用户信息
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const { selectedImageIds = [], postId = null } = await request.json();

    console.log(`用户 ${user.email} 确认使用 ${selectedImageIds.length} 张图片`);

    // 查找用户的所有临时图片
    const allTempImages = await Image.find({
      uploader: user._id,
      associatedPost: null,
      objectName: { $regex: /\/temp\// }
    });

    console.log(`找到 ${allTempImages.length} 张临时图片`);

    // 删除未选择的临时图片
    const unselectedImages = allTempImages.filter(
      img => !selectedImageIds.includes(img._id.toString())
    );

    console.log(`删除 ${unselectedImages.length} 张未选择的图片`);

    for (const image of unselectedImages) {
      try {
        // 删除MinIO中的文件
        if (image.storageType === 'minio' && image.objectName) {
          await deleteFromMinio(image.objectName);
          console.log(`✅ 已删除未选择的MinIO文件: ${image.objectName}`);
        }

        // 删除数据库记录
        await Image.findByIdAndDelete(image._id);
        console.log(`✅ 已删除未选择的图片记录: ${image.filename}`);
      } catch (error) {
        console.error(`❌ 删除未选择图片失败: ${image.filename}`, error);
      }
    }

    // 更新选中图片的状态
    const selectedImages = allTempImages.filter(
      img => selectedImageIds.includes(img._id.toString())
    );

    console.log(`更新 ${selectedImages.length} 张选中图片的状态`);

    for (const image of selectedImages) {
      try {
        // 如果有postId，更新关联关系
        if (postId) {
          await Image.findByIdAndUpdate(image._id, {
            associatedPost: postId,
            isUsed: true,
            updatedAt: new Date()
          });
          console.log(`✅ 图片已关联到文章: ${image.filename}`);
        } else {
          // 标记为已确认使用
          await Image.findByIdAndUpdate(image._id, {
            isUsed: true,
            updatedAt: new Date()
          });
          console.log(`✅ 图片已确认使用: ${image.filename}`);
        }
      } catch (error) {
        console.error(`❌ 更新图片状态失败: ${image.filename}`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功确认 ${selectedImages.length} 张图片，删除 ${unselectedImages.length} 张未选择图片`,
      confirmedImages: selectedImages.length,
      deletedImages: unselectedImages.length
    });

  } catch (error) {
    console.error('确认图片使用失败:', error);
    return NextResponse.json(
      { error: '确认图片使用失败' },
      { status: 500 }
    );
  }
} 