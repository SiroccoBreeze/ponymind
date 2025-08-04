import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import User from '@/models/User';

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
    const { content, images } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return NextResponse.json({ error: '评论不存在' }, { status: 404 });
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