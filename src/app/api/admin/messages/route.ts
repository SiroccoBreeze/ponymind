import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import User from '@/models/User';
import Post from '@/models/Post';
import Comment from '@/models/Comment';

// 检查管理员权限
async function checkAdminPermission() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return { error: '请先登录', status: 401 };
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return { error: '权限不足', status: 403 };
  }

  return { user, status: 200 };
}

// 获取管理员消息列表
export async function GET(request: Request) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 获取管理员消息（只获取发给当前管理员的消息）
    const messages = await Message.find({
      recipient: permissionCheck.user._id
    })
      .populate('sender', 'name email avatar')
      .populate('recipient', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // 获取总数
    const total = await Message.countDocuments({
      recipient: permissionCheck.user._id
    });

    const totalPages = Math.ceil(total / limit);

    // 统计未读消息数
    const unreadCount = await Message.countDocuments({
      recipient: permissionCheck.user._id,
      isRead: false
    });

    // 获取待审核内容的统计
    const pendingStats = await Promise.all([
      Post.countDocuments({ reviewStatus: 'pending' }),
      Comment.countDocuments({ reviewStatus: 'pending' })
    ]);

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      unreadCount,
      pendingStats: {
        pendingPosts: pendingStats[0],
        pendingComments: pendingStats[1]
      }
    });

  } catch (error) {
    console.error('获取管理员消息失败:', error);
    return NextResponse.json(
      { error: '获取管理员消息失败' },
      { status: 500 }
    );
  }
}

// 标记消息为已读
export async function PATCH(request: Request) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { messageIds, markAllAsRead } = await request.json();

    let result;
    if (markAllAsRead) {
      // 标记所有消息为已读
      result = await Message.updateMany(
        {
          $or: [
            { recipient: permissionCheck.user._id, isRead: false },
            { 
              type: { $in: ['info', 'warning'] }, 
              sender: null,
              isRead: false
            }
          ]
        },
        { $set: { isRead: true, updatedAt: new Date() } }
      );
    } else if (messageIds && Array.isArray(messageIds)) {
      // 标记指定消息为已读
      result = await Message.updateMany(
        { 
          _id: { $in: messageIds },
          $or: [
            { recipient: permissionCheck.user._id },
            { 
              type: { $in: ['info', 'warning'] }, 
              sender: null
            }
          ]
        },
        { $set: { isRead: true, updatedAt: new Date() } }
      );
    } else {
      return NextResponse.json({ error: '无效的参数' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      message: '消息已标记为已读',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('标记消息失败:', error);
    return NextResponse.json(
      { error: '标记消息失败' },
      { status: 500 }
    );
  }
}

// 创建系统消息（用于通知管理员）
export async function POST(request: Request) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { type, title, content, relatedId, relatedType, priority = 'normal' } = await request.json();

    // 验证消息类型
    if (!['info', 'warning', 'success', 'rejection'].includes(type)) {
      return NextResponse.json({ error: '无效的消息类型' }, { status: 400 });
    }

    // 创建系统消息
    const message = new Message({
      recipient: permissionCheck.user._id,
      sender: null, // 系统消息
      type,
      title,
      content,
      relatedId,
      relatedType,
      priority,
      isRead: false
    });

    await message.save();

    return NextResponse.json({
      success: true,
      message: '系统消息创建成功',
      messageId: message._id
    });

  } catch (error) {
    console.error('创建系统消息失败:', error);
    return NextResponse.json(
      { error: '创建系统消息失败' },
      { status: 500 }
    );
  }
}
