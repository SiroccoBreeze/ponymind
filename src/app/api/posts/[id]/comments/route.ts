import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Post from '@/models/Post';
import User from '@/models/User';
import { createMessage } from '@/app/api/users/messages/route';

// 获取评论列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    
    // 获取所有顶级评论（没有父评论的评论）
    const topLevelComments = await Comment.find({ 
      post: id, 
      parentComment: null 
    })
      .populate('author', 'name email avatar')
      .populate('likedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // 获取所有回复
    const replies = await Comment.find({ 
      post: id, 
      parentComment: { $ne: null } 
    })
      .populate('author', 'name email avatar')
      .populate('parentComment', 'author')
      .populate('likedBy', 'name')
      .sort({ createdAt: 1 })
      .lean();

    // 将回复组织到对应的父评论下
    const commentsWithReplies = topLevelComments.map(comment => ({
      ...comment,
      replies: replies.filter(reply => 
        reply.parentComment && reply.parentComment._id.toString() === comment._id.toString()
      )
    }));

    return NextResponse.json({
      success: true,
      comments: commentsWithReplies
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
    const { content, images, parentCommentId } = await request.json();

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

    // 如果是回复评论，检查父评论是否存在
    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return NextResponse.json(
          { error: '父评论不存在' },
          { status: 404 }
        );
      }
    }

    // 创建评论
    const comment = new Comment({
      content: content.trim(),
      author: user._id,
      post: id,
      parentComment: parentCommentId || null,
      images: images || [],
    });

    await comment.save();
    
    // 更新文章的回答数（只有顶级评论才计入回答数）
    if (post.type === 'question' && !parentCommentId) {
      await Post.findByIdAndUpdate(id, { $inc: { answers: 1 } });
    }

    // 发送通知
    try {
      if (parentCommentId && parentComment) {
        // 如果是回复评论，通知被回复的用户
        const parentCommentAuthor = await User.findById(parentComment.author);
        if (parentCommentAuthor && parentCommentAuthor._id.toString() !== user._id.toString()) {
          await createMessage(
            parentCommentAuthor._id.toString(),
            'comment_reply',
            '收到新回复',
            `${user.name} 回复了你的评论："${content.trim().substring(0, 100)}..."`,
            {
              senderId: user._id.toString(),
              relatedId: comment._id.toString(),
              relatedType: 'comment',
              priority: 'normal'
            }
          );
        }
      } else {
        // 如果是顶级评论，通知文章作者
        const postAuthor = await User.findById(post.author);
        if (postAuthor && postAuthor._id.toString() !== user._id.toString()) {
          await createMessage(
            postAuthor._id.toString(),
            post.type === 'question' ? 'comment_reply' : 'comment_reply',
            post.type === 'question' ? '收到新回答' : '收到新评论',
            `${user.name} ${post.type === 'question' ? '回答了你的问题' : '评论了你的文章'}："${content.trim().substring(0, 100)}..."`,
            {
              senderId: user._id.toString(),
              relatedId: post._id.toString(),
              relatedType: 'post',
              priority: 'normal'
            }
          );
        }
      }
    } catch (error) {
      console.error('发送通知失败:', error);
      // 通知失败不影响评论创建
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

// 评论点赞/取消点赞
export async function PATCH(
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

    // 查找用户
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 查找评论
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return NextResponse.json(
        { error: '评论不存在' },
        { status: 404 }
      );
    }

    if (action === 'like') {
      // 检查是否已经点赞
      if (comment.likedBy.includes(user._id)) {
        return NextResponse.json(
          { error: '已经点赞过了' },
          { status: 400 }
        );
      }

      // 添加点赞
      comment.likedBy.push(user._id);
      comment.likes += 1;
      await comment.save();

      return NextResponse.json({
        success: true,
        message: '点赞成功',
        likes: comment.likes
      });

    } else if (action === 'unlike') {
      // 检查是否已经点赞
      if (!comment.likedBy.includes(user._id)) {
        return NextResponse.json(
          { error: '还未点赞' },
          { status: 400 }
        );
      }

      // 取消点赞
      comment.likedBy = comment.likedBy.filter(id => !id.equals(user._id));
      comment.likes -= 1;
      await comment.save();

      return NextResponse.json({
        success: true,
        message: '取消点赞成功',
        likes: comment.likes
      });

    } else {
      return NextResponse.json(
        { error: '无效的操作' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('评论点赞操作失败:', error);
    return NextResponse.json(
      { error: '操作失败' },
      { status: 500 }
    );
  }
} 