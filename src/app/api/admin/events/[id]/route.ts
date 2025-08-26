import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import User from '@/models/User';
// 确保 Image 模型被注册
import '@/models/Image';
import { moveAttachmentToEvent } from '@/lib/minio';
import Image from '@/models/Image';
import { deleteFromMinio } from '@/lib/minio';
import { updateTagCounts } from '@/lib/tag-count-utils';

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
    const { title, description, tags, occurredAt, attachmentIds, deletedAttachmentIds } = body;

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

    // 查找并更新事件
    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ error: '事件不存在' }, { status: 404 });
    }

    // 更新事件基本信息
    event.title = title;
    event.description = description || '';
    event.tags = validTags;
    event.occurredAt = new Date(occurredAt);
    event.attachments = attachmentIds || [];
    event.updatedAt = new Date();

    await event.save();
    
    // 处理附件变化：将临时附件移动到事件目录
    if (attachmentIds && attachmentIds.length > 0) {
      try {
        // 获取附件信息
        const attachments = await Image.find({ _id: { $in: attachmentIds } });
        
        for (const attachment of attachments) {
          try {
            // 检查附件是否已经在正确的事件目录中
            if (attachment.objectName && attachment.objectName.includes(`/event/${event._id}/`)) {
              // 附件已经在正确位置，只需要更新状态
              console.log(`附件 ${attachment.filename} 已在正确位置，跳过移动`);
              await Image.findByIdAndUpdate(attachment._id, {
                $set: {
                  isUsed: true,
                  associatedPost: event._id,
                  updatedAt: new Date()
                }
              });
            } else {
              // 附件需要移动到事件目录
              console.log(`移动附件 ${attachment.filename} 到事件目录`);
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
                  updatedAt: new Date()
                }
              });
            }
          } catch (moveError) {
            console.error(`处理附件 ${attachment._id} 失败:`, moveError);
            // 即使处理失败，也要标记为已使用
            await Image.findByIdAndUpdate(attachment._id, {
              $set: {
                isUsed: true,
                associatedPost: event._id,
                updatedAt: new Date()
              }
            });
          }
        }
      } catch (e) {
        console.error('处理附件失败', e);
      }
    }

    // 处理需要删除的附件
    if (deletedAttachmentIds && deletedAttachmentIds.length > 0) {
      try {
        // 获取需要删除的附件信息
        const attachmentsToDelete = await Image.find({ _id: { $in: deletedAttachmentIds } });
        
        for (const attachment of attachmentsToDelete) {
          try {
            // 从MinIO中删除文件
            if (attachment.storageType === 'minio' && attachment.objectName) {
              await deleteFromMinio(attachment.objectName);
              console.log(`✅ 已删除MinIO文件: ${attachment.objectName}`);
            }
            
            // 删除数据库中的图片记录
            await Image.findByIdAndDelete(attachment._id);
            console.log(`✅ 已删除图片记录: ${attachment.filename}`);
          } catch (deleteError) {
            console.error(`删除附件 ${attachment._id} 失败:`, deleteError);
            // 继续删除其他附件，不因为单个失败而中断
          }
        }
        
        console.log(`✅ 已清理 ${attachmentsToDelete.length} 个删除的附件`);
      } catch (e) {
        console.error('清理删除的附件失败', e);
      }
    }
    
    // 更新标签计数
    if (validTags.length > 0) {
      await updateTagCounts(validTags);
    }

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

    // 删除事件相关的图片和附件
    if (event.attachments && event.attachments.length > 0) {
      try {
        // 获取所有附件信息
        const attachments = await Image.find({ _id: { $in: event.attachments } });
        
        for (const attachment of attachments) {
          try {
            // 从MinIO中删除文件
            if (attachment.storageType === 'minio' && attachment.objectName) {
              await deleteFromMinio(attachment.objectName);
              console.log(`✅ 已删除MinIO文件: ${attachment.objectName}`);
            }
            
            // 删除数据库中的图片记录
            await Image.findByIdAndDelete(attachment._id);
            console.log(`✅ 已删除图片记录: ${attachment.filename}`);
          } catch (deleteError) {
            console.error(`删除附件 ${attachment._id} 失败:`, deleteError);
            // 继续删除其他附件，不因为单个失败而中断
          }
        }
        
        console.log(`✅ 已清理 ${attachments.length} 个事件附件`);
      } catch (e) {
        console.error('清理事件附件失败', e);
        // 即使清理附件失败，也要继续删除事件
      }
    }

    // 删除事件前获取标签信息用于更新计数
    const eventTags = event.tags || [];
    
    // 删除事件
    await Event.findByIdAndDelete(id);

    // 更新标签计数
    if (eventTags.length > 0) {
      await updateTagCounts(eventTags);
    }

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