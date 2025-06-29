import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Post from '@/models/Post';
import User from '@/models/User';

// 获取评论列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const comments = await Comment.find({ post: id })
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
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '评论内容不能为空' },
        { status: 400 }
      );
    }

    // 检查文章是否存在
    const post = await Post.findById(id);
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
      post: id,
    });

    await comment.save();
    
    // 更新文章的回答数
    if (post.type === 'question') {
      await Post.findByIdAndUpdate(id, { $inc: { answers: 1 } });
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

// 标记最佳答案
export async function PUT(
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
    const { commentId, action } = await request.json();

    if (!commentId || !action) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 检查文章是否存在并且是问题类型
    const post = await Post.findById(id).populate('author', 'email');
    if (!post) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    if (post.type !== 'question') {
      return NextResponse.json(
        { error: '只有问题才能标记最佳答案' },
        { status: 400 }
      );
    }

    // 检查是否为问题作者
    if (post.author.email !== session.user.email) {
      return NextResponse.json(
        { error: '只有问题作者才能标记最佳答案' },
        { status: 403 }
      );
    }

    // 检查评论是否存在
    const comment = await Comment.findOne({ _id: commentId, post: id });
    if (!comment) {
      return NextResponse.json(
        { error: '评论不存在' },
        { status: 404 }
      );
    }

    if (action === 'accept') {
      // 如果已有最佳答案，先取消之前的标记
      if (post.acceptedAnswer) {
        await Comment.findByIdAndUpdate(post.acceptedAnswer, { isAccepted: false });
      }

      // 标记新的最佳答案
      comment.isAccepted = true;
      await comment.save();

      // 更新文章的acceptedAnswer字段和状态
      post.acceptedAnswer = commentId;
      post.status = 'answered';
      await post.save();

    } else if (action === 'unaccept') {
      // 取消最佳答案标记
      comment.isAccepted = false;
      await comment.save();

      // 清除文章的acceptedAnswer字段，状态改为open
      post.acceptedAnswer = null;
      post.status = 'open';
      await post.save();

    } else {
      return NextResponse.json(
        { error: '无效的操作' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: action === 'accept' ? '已标记为最佳答案' : '已取消最佳答案标记'
    });

  } catch (error) {
    console.error('标记最佳答案失败:', error);
    return NextResponse.json(
      { error: '操作失败' },
      { status: 500 }
    );
  }
} 