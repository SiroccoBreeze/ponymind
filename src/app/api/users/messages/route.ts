import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import User from '@/models/User';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    await connectDB();

    // 查找用户
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 分页参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // 获取消息列表
    const messages = await Message.find({ recipient: user._id })
      .populate('sender', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // 获取总数
    const total = await Message.countDocuments({ recipient: user._id });
    const totalPages = Math.ceil(total / limit);

    // 统计未读消息数
    const unreadCount = await Message.countDocuments({ 
      recipient: user._id, 
      isRead: false 
    });

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
      unreadCount
    });

  } catch (error) {
    console.error('获取消息失败:', error);
    return NextResponse.json(
      { error: '获取消息失败' },
      { status: 500 }
    );
  }
}

// 标记消息为已读
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    await connectDB();

    // 查找用户
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const { messageIds, markAllAsRead } = await request.json();

    let result;
    if (markAllAsRead) {
      // 标记所有消息为已读
      result = await Message.updateMany(
        { recipient: user._id, isRead: false },
        { $set: { isRead: true, updatedAt: new Date() } }
      );
    } else if (messageIds && Array.isArray(messageIds)) {
      // 标记指定消息为已读
      result = await Message.updateMany(
        { 
          _id: { $in: messageIds },
          recipient: user._id
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

