import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Post from '@/models/Post';
import User from '@/models/User';
import { createMessage } from '@/lib/message-utils';
import { Types } from 'mongoose';
import Message from '@/models/Message';

// 评论数据类型
interface CommentData {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  parentComment?: {
    _id: string;
    author: {
      _id: string;
      name: string;
      email: string;
      avatar?: string;
    };
  } | null;
  images?: string[];
  isAccepted?: boolean;
  likes: number;
  likedBy?: {
    _id: string;
    name: string;
  }[];
  createdAt: string;
  replies?: CommentData[];
}

// MongoDB文档类型
interface CommentDocument {
  _id: Types.ObjectId;
  content: string;
  author: {
    _id: Types.ObjectId;
    name: string;
    email: string;
    avatar?: string;
  };
  parentComment?: {
    _id: Types.ObjectId;
    author: {
      _id: Types.ObjectId;
      name: string;
      email: string;
      avatar?: string;
    };
  } | null;
  images?: string[];
  isAccepted?: boolean;
  likes: number;
  likedBy?: {
    _id: Types.ObjectId;
    name: string;
  }[];
  createdAt: Date;
}

// 递归构建评论树
function buildCommentTree(comments: CommentDocument[], parentId: string | null = null): CommentData[] {
  return comments
    .filter(comment => {
      if (parentId === null) {
        return !comment.parentComment;
      }
      return comment.parentComment && comment.parentComment._id.toString() === parentId;
    })
    .map(comment => ({
      _id: comment._id.toString(),
      content: comment.content,
      author: {
        _id: comment.author._id.toString(),
        name: comment.author.name,
        email: comment.author.email,
        avatar: comment.author.avatar
      },
      parentComment: comment.parentComment ? {
        _id: comment.parentComment._id.toString(),
        author: {
          _id: comment.parentComment.author._id.toString(),
          name: comment.parentComment.author.name,
          email: comment.parentComment.author.email,
          avatar: comment.parentComment.author.avatar
        }
      } : null,
      images: comment.images,
      isAccepted: comment.isAccepted,
      likes: comment.likes,
      likedBy: comment.likedBy?.map((user: { _id: Types.ObjectId; name: string }) => ({
        _id: user._id.toString(),
        name: user.name
      })),
      createdAt: comment.createdAt.toISOString(),
      replies: buildCommentTree(comments, comment._id.toString())
    }));
}

// 获取评论列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    
    // 获取所有评论（包括顶级评论和所有回复）
    const allComments = (await Comment.find({ post: id })
      .populate('author', 'name email avatar')
      .populate('parentComment', '_id author')
      .populate('likedBy', 'name')
      .sort({ createdAt: -1 })
      .lean()) as unknown as CommentDocument[];

    // 构建评论树结构
    const commentsWithReplies = buildCommentTree(allComments);

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
    
    // 更新文章的回答数和状态（只有顶级评论才计入回答数）
    if (post.type === 'question' && !parentCommentId) {
      await Post.findByIdAndUpdate(id, { 
        $inc: { answers: 1 },
        status: 'answered' // 当问题有了回答后，状态更新为answered
      });
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
              relatedId: post._id.toString(), // 使用文章ID而不是评论ID
              relatedType: 'post',
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

    // 如果评论需要审核，创建待审核通知
    try {
      // 查找所有管理员用户
      const adminUsers = await User.find({ 
        role: { $in: ['admin', 'moderator'] } 
      });

      // 为每个管理员创建待审核通知
      for (const admin of adminUsers) {
        const messageTitle = `新评论待审核`;
        const messageContent = `用户 ${user.name} 发布了新评论，需要您审核。

评论内容：${content.trim().substring(0, 100)}${content.length > 100 ? '...' : ''}
评论类型：${parentCommentId ? '回复评论' : '顶级评论'}
发布时间：${new Date().toLocaleDateString('zh-CN')}

请及时审核此评论。`;

        await Message.create({
          recipient: admin._id,
          sender: null, // 系统消息
          type: 'warning',
          title: messageTitle,
          content: messageContent,
          relatedId: comment._id,
          relatedType: 'comment',
          priority: 'normal',
          isRead: false
        });
      }
      
      console.log(`已为 ${adminUsers.length} 个管理员创建评论待审核通知`);
    } catch (notificationError) {
      console.error('创建评论待审核通知失败:', notificationError);
      // 通知创建失败不影响评论创建
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
      comment.likedBy = comment.likedBy.filter((likedId: Types.ObjectId) => !likedId.equals(user._id));
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