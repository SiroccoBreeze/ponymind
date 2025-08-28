import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import User from '@/models/User';
// 确保 Image 模型被注册
import '@/models/Image';
import { moveAttachmentToEvent } from '@/lib/minio';
import Image from '@/models/Image';
import { updateTagCounts } from '@/lib/tag-count-utils';
import { getCurrentUTCTime, localToUTC } from '@/lib/time-utils';

// 获取事件列表
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const tags = searchParams.get('tags') || '';
    const status = searchParams.get('status') || '';

    // 构建查询条件
    const query: any = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (tags && tags !== 'all') {
      if (tags === 'has_tags') {
        query.tags = { $exists: true, $ne: [], $not: { $size: 0 } };
      } else if (tags === 'no_tags') {
        query.$or = [
          { tags: { $exists: false } },
          { tags: [] },
          { tags: { $size: 0 } }
        ];
      }
    }
    
    if (status && status !== 'all') {
      if (status === 'active') {
        query.occurredAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }; // 30天内
      } else if (status === 'inactive') {
        query.occurredAt = { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }; // 30天前
      }
    }

    // 计算总数
    const total = await Event.countDocuments(query);
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // 确保 Image 模型已注册
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const Image = (await import('@/models/Image')).default;
    
    // 获取事件列表
    const events = await Event.find(query)
      .setOptions({ strictPopulate: false })
      .populate('creator', 'name email avatar')
      .populate('attachments')
      .sort({ occurredAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      events,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });

  } catch (error) {
    console.error('获取事件列表失败:', error);
    return NextResponse.json(
      { error: '获取事件列表失败' },
      { status: 500 }
    );
  }
}

// 创建新事件
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { title, description, tags, occurredAt, attachmentIds } = body;

    // 验证必填字段
    if (!title || !occurredAt) {
      return NextResponse.json(
        { error: '标题和发生时间为必填字段' },
        { status: 400 }
      );
    }

    // 过滤并校验标签格式
    const validTags = Array.isArray(tags)
      ? tags.filter((tag: string) => typeof tag === 'string' && tag.trim().length > 0)
      : [];

    // 创建事件
    const event = new Event({
      title,
      description: description || '',
      tags: validTags,
      occurredAt: localToUTC(occurredAt), // 将前端本地时间转换为UTC时间
      creator: user._id,
      attachments: attachmentIds || []
    });

    await event.save();
    
    // 处理附件：将临时附件移动到事件目录
    if (attachmentIds && attachmentIds.length > 0) {
      try {
        // 获取附件信息并移动到事件目录
        const attachments = await Image.find({ _id: { $in: attachmentIds } });
        
        for (const attachment of attachments) {
          try {
            // 移动附件到事件目录
            const newUrl = await moveAttachmentToEvent(
              attachment.objectName,
              user._id.toString(),
              event._id.toString(),
              attachment.filename
            );
            
            // 更新数据库中的URL和objectName
            await Image.findByIdAndUpdate(attachment._id, {
              $set: {
                url: newUrl,
                objectName: `images/${user._id}/event/${event._id}/${attachment.filename}`,
                isUsed: true,
                associatedPost: event._id,
                updatedAt: getCurrentUTCTime()
              }
            });
          } catch (moveError) {
            console.error(`移动附件 ${attachment._id} 失败:`, moveError);
            // 即使移动失败，也要标记为已使用
            await Image.findByIdAndUpdate(attachment._id, {
              $set: {
                isUsed: true,
                associatedPost: event._id,
                updatedAt: getCurrentUTCTime()
              }
            });
          }
        }
      } catch (e) {
        console.error('处理附件失败', e);
      }
    }
    
    // 更新标签计数
    if (validTags.length > 0) {
      await updateTagCounts(validTags);
    }

    // 返回创建的事件
    const createdEvent = await Event.findById(event._id)
      .setOptions({ strictPopulate: false })
      .populate('creator', 'name email avatar')
      .populate('attachments')
      .lean();

    return NextResponse.json({
      success: true,
      message: '事件创建成功',
      event: createdEvent
    }, { status: 201 });

  } catch (error) {
    console.error('创建事件失败:', error);
    return NextResponse.json(
      { error: '创建事件失败' },
      { status: 500 }
    );
  }
} 