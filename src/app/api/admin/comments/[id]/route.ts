import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import User from '@/models/User';
import Image from '@/models/Image';
import { deleteFromMinio } from '@/lib/minio';

// 更新评论
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 检查管理员权限
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const { content, images, imagesToDelete } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return NextResponse.json({ error: '评论不存在' }, { status: 404 });
    }

    // 删除需要删除的图片文件
    if (imagesToDelete && imagesToDelete.length > 0) {
      try {
        // 查找相关的图片记录
        const imageRecords = await Image.find({
          url: { $in: imagesToDelete }
        });

        // 删除MinIO中的文件
        for (const imageRecord of imageRecords) {
          if (imageRecord.storageType === 'minio' && imageRecord.objectName) {
            try {
              await deleteFromMinio(imageRecord.objectName);
              console.log(`✅ 已删除MinIO文件: ${imageRecord.objectName}`);
            } catch (error) {
              console.error(`❌ 删除MinIO文件失败: ${imageRecord.objectName}`, error);
            }
          }
        }

        // 删除数据库中的图片记录
        await Image.deleteMany({
          url: { $in: imagesToDelete }
        });
        console.log(`✅ 已删除 ${imageRecords.length} 张图片记录`);
      } catch (error) {
        console.error('删除评论图片失败:', error);
        // 图片删除失败不影响评论更新
      }
    }

    // 更新评论内容和图片
    comment.content = content.trim();
    comment.images = images || [];
    comment.updatedAt = new Date();
    await comment.save();

    return NextResponse.json({
      success: true,
      message: '评论更新成功',
      comment
    });

  } catch (error) {
    console.error('更新评论失败:', error);
    return NextResponse.json(
      { error: '更新评论失败' },
      { status: 500 }
    );
  }
}

// 删除评论
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 检查管理员权限
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;

    const comment = await Comment.findById(id);
    if (!comment) {
      return NextResponse.json({ error: '评论不存在' }, { status: 404 });
    }

    // 如果是问题的最佳答案，需要更新问题状态
    if (comment.isAccepted) {
      const Post = (await import('@/models/Post')).default;
      await Post.updateMany(
        { acceptedAnswer: comment._id },
        { $unset: { acceptedAnswer: 1 } }
      );
    }

    // 删除评论相关的图片文件
    if (comment.images && comment.images.length > 0) {
      try {
        // 查找相关的图片记录
        const imageRecords = await Image.find({
          url: { $in: comment.images }
        });

        // 删除MinIO中的文件
        for (const imageRecord of imageRecords) {
          if (imageRecord.storageType === 'minio' && imageRecord.objectName) {
            try {
              await deleteFromMinio(imageRecord.objectName);
              console.log(`✅ 已删除MinIO文件: ${imageRecord.objectName}`);
            } catch (error) {
              console.error(`❌ 删除MinIO文件失败: ${imageRecord.objectName}`, error);
            }
          }
        }

        // 删除数据库中的图片记录
        await Image.deleteMany({
          url: { $in: comment.images }
        });
        console.log(`✅ 已删除 ${imageRecords.length} 张图片记录`);
      } catch (error) {
        console.error('删除评论图片失败:', error);
        // 图片删除失败不影响评论删除
      }
    }

    // 删除评论及其所有回复
    await Comment.deleteMany({
      $or: [
        { _id: comment._id },
        { parentComment: comment._id }
      ]
    });

    // 更新文章的评论数量
    const Post = (await import('@/models/Post')).default;
    const post = await Post.findById(comment.post);
    if (post) {
      // 计算删除后的评论数量
      const remainingComments = await Comment.countDocuments({ post: comment.post });
      post.answers = remainingComments;
      await post.save();
    }

    return NextResponse.json({
      success: true,
      message: '评论删除成功'
    });

  } catch (error) {
    console.error('删除评论失败:', error);
    return NextResponse.json(
      { error: '删除评论失败' },
      { status: 500 }
    );
  }
} 