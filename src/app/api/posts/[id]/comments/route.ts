import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Post from '@/models/Post';
import User from '@/models/User';

// 获取评论列表
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const comments = await Comment.find({ post: params.id })
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      comments
    });

  } catch (error) {
    console.error('获取评论失败:', error);
    return NextResponse.json(
      { error: '获取评论失败' },
      { status: 500 }
    );
  }
}

// 创建新评论
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '评论内容不能为空' },
        { status: 400 }
      );
    }

    // 检查文章是否存在
    const post = await Post.findById(params.id);
    if (!post) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    // 查找用户
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 创建评论
    const comment = new Comment({
      content: content.trim(),
      author: user._id,
      post: params.id,
    });

    await comment.save();
    
    // 更新文章的回答数
    if (post.type === 'question') {
      await Post.findByIdAndUpdate(params.id, { $inc: { answers: 1 } });
    }

    // 返回带有作者信息的评论
    await comment.populate('author', 'name email avatar');

    return NextResponse.json({
      success: true,
      comment
    }, { status: 201 });

  } catch (error) {
    console.error('创建评论失败:', error);
    return NextResponse.json(
      { error: '创建评论失败' },
      { status: 500 }
    );
  }
} 