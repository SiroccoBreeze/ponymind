import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Image from '@/models/Image';
import { deleteFromMinio } from '@/lib/minio';

export async function POST(request: NextRequest) {
  try {
    // 验证会话
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '需要登录才能执行清理操作' },
        { status: 401 }
      );
    }

    await connectDB();

    // 查找所有未关联到文章的图片
    const unusedImages = await Image.find({
      associatedPost: null,
      isUsed: false
    });

    console.log(`找到 ${unusedImages.length} 张未使用的图片`);

    let deletedCount = 0;
    let errorCount = 0;

    for (const imageRecord of unusedImages) {
      try {
        // 删除MinIO中的文件
        if (imageRecord.storageType === 'minio' && imageRecord.objectName) {
          await deleteFromMinio(imageRecord.objectName);
          console.log(`✅ 已删除MinIO文件: ${imageRecord.objectName}`);
        }
        
        // 删除数据库记录
        await Image.findByIdAndDelete(imageRecord._id);
        console.log(`✅ 已删除图片记录: ${imageRecord.filename}`);
        
        deletedCount++;
      } catch (error) {
        console.error(`❌ 删除图片失败: ${imageRecord.filename}`, error);
        errorCount++;
      }
    }

    return NextResponse.json({
      message: '清理完成',
      deletedCount,
      errorCount,
      totalUnused: unusedImages.length
    });

  } catch (error) {
    console.error('❌ 清理操作失败:', error);
    return NextResponse.json(
      { error: '清理操作失败' },
      { status: 500 }
    );
  }
} 