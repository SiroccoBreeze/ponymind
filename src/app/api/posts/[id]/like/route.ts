import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';

export async function POST(
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
    // 查找用户和文章
    const [user, post] = await Promise.all([
      User.findOne({ email: session.user.email }),
      Post.findById(id)
    ]);

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    if (!post) {
      return NextResponse.json(
        { error: '内容不存在' },
        { status: 404 }
      );
    }

    // 检查用户是否已经点赞
    const userLikedPosts = user.likedPosts || [];
    const hasLiked = userLikedPosts.includes(id);

    if (hasLiked) {
      // 取消点赞
      user.likedPosts = userLikedPosts.filter((postId: string) => postId !== id);
      post.likes = Math.max(0, (post.likes || 0) - 1);
    } else {
      // 添加点赞
      user.likedPosts = [...userLikedPosts, id];
      post.likes = (post.likes || 0) + 1;
    }

    // 保存更改
    await Promise.all([
      user.save(),
      post.save()
    ]);

    return NextResponse.json({
      success: true,
      liked: !hasLiked,
      likes: post.likes
    });

  } catch (error) {
    console.error('点赞操作失败:', error);
    return NextResponse.json(
      { error: '点赞操作失败' },
      { status: 500 }
    );
  }
} 