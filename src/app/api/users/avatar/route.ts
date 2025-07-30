import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Image from '@/models/Image';
import { uploadToMinio, deleteFromMinio } from '@/lib/minio';

export async function POST(request: NextRequest) {
  try {
    // 验证会话
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '需要登录才能上传头像' },
        { status: 401 }
      );
    }

    await connectDB();

    // 查找用户
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { error: '请选择头像文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '只支持 JPG、PNG、GIF、WebP 格式的图片' },
        { status: 400 }
      );
    }

    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '头像文件大小不能超过 5MB' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 生成唯一文件名
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `avatar_${user._id}_${timestamp}.${extension}`;

    try {
      // 删除旧头像（如果存在）
      if (user.avatar) {
        try {
          // 从旧头像URL中提取对象名称
          const oldObjectName = user.avatar.replace('/api/images/', '');
          await deleteFromMinio(oldObjectName);
          console.log(`✅ 已删除旧头像: ${oldObjectName}`);
          
          // 删除旧头像的数据库记录
          await Image.findOneAndDelete({ 
            objectName: oldObjectName,
            uploader: user._id 
          });
          console.log(`✅ 已删除旧头像记录: ${oldObjectName}`);
        } catch (error) {
          console.error('删除旧头像失败:', error);
          // 继续执行，不影响新头像上传
        }
      }

      // 上传新头像到MinIO
      const avatarUrl = await uploadToMinio(
        buffer,
        fileName,
        file.type,
        undefined, // 使用默认bucket
        user._id.toString(),
        undefined, // 头像不需要postId
        true // 标记为头像文件
      );

      // 从avatarUrl中提取objectName，确保一致性
      const objectName = avatarUrl.replace('/api/images/', '');

      // 创建图片记录
      const newImage = new Image({
        filename: fileName,
        originalName: file.name,
        mimetype: file.type,
        size: file.size,
        uploader: user._id,
        objectName: objectName,
        url: avatarUrl,
        storageType: 'minio',
        isUsed: true,
        isConfirmed: true,
        associatedPost: null, // 头像不关联文章
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newImage.save();
      console.log(`✅ 已创建头像记录: ${fileName}`);

      // 更新用户头像
      await User.findByIdAndUpdate(user._id, {
        avatar: avatarUrl,
        updatedAt: new Date()
      });

      console.log(`✅ 用户头像上传成功: ${user.email} -> ${avatarUrl}`);

      return NextResponse.json({
        success: true,
        message: '头像上传成功',
        avatarUrl
      });

    } catch (error) {
      console.error('❌ 头像上传失败:', error);
      return NextResponse.json(
        { error: '头像上传失败' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ 头像上传处理失败:', error);
    return NextResponse.json(
      { error: '头像上传处理失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 验证会话
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '需要登录才能删除头像' },
        { status: 401 }
      );
    }

    await connectDB();

    // 查找用户
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    if (!user.avatar) {
      return NextResponse.json(
        { error: '用户没有头像' },
        { status: 400 }
      );
    }

    try {
      // 从头像URL中提取对象名称
      const objectName = user.avatar.replace('/api/images/', '');
      await deleteFromMinio(objectName);
      console.log(`✅ 已删除头像文件: ${objectName}`);

      // 删除头像的数据库记录
      await Image.findOneAndDelete({ 
        objectName: objectName,
        uploader: user._id 
      });
      console.log(`✅ 已删除头像记录: ${objectName}`);

      // 清除用户头像字段
      await User.findByIdAndUpdate(user._id, {
        $unset: { avatar: 1 },
        updatedAt: new Date()
      });

      console.log(`✅ 用户头像删除成功: ${user.email}`);

      return NextResponse.json({
        success: true,
        message: '头像删除成功'
      });

    } catch (error) {
      console.error('❌ 头像删除失败:', error);
      return NextResponse.json(
        { error: '头像删除失败' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ 头像删除处理失败:', error);
    return NextResponse.json(
      { error: '头像删除处理失败' },
      { status: 500 }
    );
  }
} 