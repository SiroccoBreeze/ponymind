import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import User from '@/models/User';
// 确保 Image 模型被注册
import '@/models/Image';

// 获取单个事件详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查用户是否为管理员
    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id } = await params;

    // 确保 Image 模型已注册
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const Image = (await import('@/models/Image')).default;
    
    // 查找事件
    const event = await Event.findById(id)
      .setOptions({ strictPopulate: false })
      .populate('creator', 'name email avatar')
      .populate('attachments')
      .lean();

    if (!event) {
      return NextResponse.json({ error: '事件不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      event
    });

  } catch (error) {
    console.error('获取事件详情失败:', error);
    return NextResponse.json(
      { error: '获取事件详情失败' },
      { status: 500 }
    );
  }
}

// 更新事件
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查用户是否为管理员
    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, category, occurredAt, attachmentIds } = body;

    // 验证必填字段
    if (!title || !occurredAt) {
      return NextResponse.json(
        { error: '标题和发生时间为必填字段' },
        { status: 400 }
      );
    }

    // 查找并更新事件
    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ error: '事件不存在' }, { status: 404 });
    }

    // 更新事件字段
    event.title = title;
    event.description = description || '';
    event.category = category || 'other';
    event.occurredAt = new Date(occurredAt);
    event.attachments = attachmentIds || [];
    event.updatedAt = new Date();

    await event.save();
    
    // 返回更新后的事件
    const updatedEvent = await Event.findById(id)
      .setOptions({ strictPopulate: false })
      .populate('creator', 'name email avatar')
      .populate('attachments')
      .lean();

    return NextResponse.json({
      success: true,
      message: '事件更新成功',
      event: updatedEvent
    });

  } catch (error) {
    console.error('更新事件失败:', error);
    return NextResponse.json(
      { error: '更新事件失败' },
      { status: 500 }
    );
  }
}

// 删除事件
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查用户是否为管理员
    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id } = await params;

    // 查找事件
    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ error: '事件不存在' }, { status: 404 });
    }

    // 删除事件
    await Event.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: '事件删除成功'
    });

  } catch (error) {
    console.error('删除事件失败:', error);
    return NextResponse.json(
      { error: '删除事件失败' },
      { status: 500 }
    );
  }
} 