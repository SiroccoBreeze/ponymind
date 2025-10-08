import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import User from '@/models/User';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import UserGroup from '@/models/UserGroup'; // 需要导入以注册模型，用于populate('userGroups')
import { getCurrentUTCTime, localToUTC } from '@/lib/time-utils';
import Image from '@/models/Image';
import { moveAttachmentToEvent } from '@/lib/minio';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  let tags: string | undefined;
  let status: string | undefined;
  let limit: number = 200;
  
  try {
    await connectDB();
    const session = await getServerSession();
    
    const { searchParams } = new URL(req.url);
    tags = searchParams.get('tags') || undefined;
    status = searchParams.get('status') || undefined;
    limit = Number(searchParams.get('limit') || '200');

    const query: Record<string, unknown> = {};
    if (tags) query.tags = { $in: tags.split(',') };
    if (status) query.status = status;

    // 用户组隔离：只有登录用户才能看到事件
    if (session?.user?.email) {
      const user = await User.findOne({ email: session.user.email }).populate('userGroups');
      if (user) {
        if (user.userGroups && user.userGroups.length > 0) {
          // 如果用户加入了用户组，可以看到同组用户创建的事件
          const userGroupIds = user.userGroups.map((group: { _id: string }) => group._id);
          const groupUserIds = await User.find({ userGroups: { $in: userGroupIds } }).distinct('_id');
          
          console.log('用户组权限调试信息:', {
            userId: user._id,
            userEmail: user.email,
            userGroupIds: userGroupIds,
            groupUserIds: groupUserIds,
            userGroups: user.userGroups
          });
          
          query.$or = [
            { creator: user._id }, // 用户自己创建的事件
            { creator: { $in: groupUserIds } } // 同组用户创建的事件
          ];
        } else {
          // 如果用户没有加入任何用户组，只能看到自己创建的事件
          query.creator = user._id;
        }
      } else {
        return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
      }
    } else {
      // 未登录用户不能查看事件
      return NextResponse.json({ success: false, message: '需要登录才能查看事件' }, { status: 401 });
    }

    const events = await Event.find(query)
      .setOptions({ strictPopulate: false })
      .sort({ occurredAt: -1 })
      .limit(limit)
      .populate({ path: 'attachments', select: 'originalName url size mimetype' })
      .populate({ path: 'creator', select: 'name avatar email' });

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('GET /api/events error', error);
    
    // 记录获取事件列表失败日志
    logger.error('获取事件列表失败', error, {
      operation: 'get_events_list',
      tags,
      status,
      limit,
      context: '获取事件列表时发生错误'
    });
    
    return NextResponse.json({ success: false, message: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email }).populate('userGroups');
    if (!user) {
      return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
    }

    const body = await req.json();
    const { title, description = '', tags = [], status = 'planned', occurredAt, attachmentIds = [] } = body;
    
    // 获取用户的用户组信息
    const userGroupIds = user.userGroups?.map((group: { _id: string }) => group._id) || [];

    if (!title || !occurredAt) {
      return NextResponse.json({ success: false, message: 'title 与 occurredAt 为必填' }, { status: 400 });
    }

    // 过滤并校验附件ID格式
    const validAttachmentIds = Array.isArray(attachmentIds)
      ? attachmentIds.filter((id: string) => typeof id === 'string')
      : [];

    // 过滤并校验标签格式
    const validTags = Array.isArray(tags)
      ? tags.filter((tag: string) => typeof tag === 'string' && tag.trim().length > 0)
      : [];

    // 处理时间转换
    let utcOccurredAt: Date;
    try {
      utcOccurredAt = localToUTC(occurredAt);
    } catch (timeError) {
      console.error('时间转换失败:', timeError);
      return NextResponse.json({ 
        success: false, 
        message: `时间格式错误: ${occurredAt}` 
      }, { status: 400 });
    }

    console.log('事件创建调试信息:', {
      userId: user._id,
      userEmail: user.email,
      userGroupIds: userGroupIds,
      userGroups: user.userGroups
    });

    const created = await Event.create({
      title,
      description,
      tags: validTags,
      status,
      occurredAt: utcOccurredAt,
      creator: user._id,
      attachments: validAttachmentIds,
      updatedAt: getCurrentUTCTime()
    });

    // 记录事件创建成功日志
    logger.event('事件创建成功', user._id.toString(), user.email, {
      operation: 'create_event',
      eventId: created._id.toString(),
      title: created.title,
      status: created.status,
      tags: created.tags,
      occurredAt: created.occurredAt,
      hasAttachments: validAttachmentIds.length > 0,
      attachmentCount: validAttachmentIds.length
    });

    if (validAttachmentIds.length > 0) {
      console.log(`🔍 开始处理 ${validAttachmentIds.length} 个附件...`);
      
      // 记录附件处理开始日志
      logger.user('开始处理事件附件', user._id.toString(), user.email, {
        operation: 'process_event_attachments',
        eventId: created._id.toString(),
        eventTitle: created.title,
        attachmentCount: validAttachmentIds.length,
        attachmentIds: validAttachmentIds
      });
      
      try {
        // 获取附件信息并移动到事件目录
        const attachmentRecords = await Image.find({ _id: { $in: validAttachmentIds } });
        console.log(`📁 找到 ${attachmentRecords.length} 个附件记录:`, attachmentRecords.map(a => ({ id: a._id, filename: a.filename, objectName: a.objectName })));
        
        for (const attachment of attachmentRecords) {
          try {
            console.log(`🔄 开始移动附件: ${attachment.filename} (${attachment.objectName})`);
            
            // 移动附件到事件目录
            const newUrl = await moveAttachmentToEvent(
              attachment.objectName,
              user._id.toString(),
              created._id.toString(),
              attachment.filename
            );
            
            console.log(`✅ 附件移动成功: ${attachment.filename} -> ${newUrl}`);
            
            // 更新数据库中的URL和objectName
            const newObjectName = `images/${user._id}/event/${created._id}/${attachment.filename}`;
            await Image.findByIdAndUpdate(attachment._id, {
              $set: {
                url: newUrl,
                objectName: newObjectName,
                isUsed: true,
                associatedPost: created._id,
                updatedAt: getCurrentUTCTime()
              }
            });
            
            console.log(`💾 数据库更新成功: ${attachment._id} -> ${newObjectName}`);
            
            // 记录单个附件处理成功日志
            logger.user('附件处理成功', user._id.toString(), user.email, {
              operation: 'attachment_processed',
              eventId: created._id.toString(),
              eventTitle: created.title,
              attachmentId: attachment._id.toString(),
              attachmentName: attachment.filename,
              newObjectName,
              newUrl
            });
          } catch (moveError) {
            console.error(`❌ 移动附件 ${attachment._id} 失败:`, moveError);
            
            // 记录附件处理失败日志
            logger.error('附件处理失败', moveError, {
              operation: 'attachment_process_failed',
              userId: user._id.toString(),
              userEmail: user.email,
              eventId: created._id.toString(),
              eventTitle: created.title,
              attachmentId: attachment._id.toString(),
              attachmentName: attachment.filename,
              context: '移动附件到事件目录时发生错误'
            });
            
            // 即使移动失败，也要标记为已使用
            await Image.findByIdAndUpdate(attachment._id, {
              $set: {
                isUsed: true,
                associatedPost: created._id,
                updatedAt: getCurrentUTCTime()
              }
            });
          }
        }
        
        // 记录附件处理完成日志
        logger.user('事件附件处理完成', user._id.toString(), user.email, {
          operation: 'event_attachments_completed',
          eventId: created._id.toString(),
          eventTitle: created.title,
          totalAttachments: validAttachmentIds.length,
          processedAttachments: attachmentRecords.length
        });
      } catch (e) {
        console.error('❌ 处理附件失败', e);
        
        // 记录附件处理整体失败日志
        logger.error('事件附件处理整体失败', e, {
          operation: 'event_attachments_failed',
          userId: user._id.toString(),
          userEmail: user.email,
          eventId: created._id.toString(),
          eventTitle: created.title,
          attachmentCount: validAttachmentIds.length,
          context: '处理事件附件时发生错误'
        });
      }
    }

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('POST /api/events error', error);
    
    // 记录事件创建失败日志
    logger.error('事件创建失败', error, {
      operation: 'create_event',
      context: '创建事件时发生错误'
    });
    
    return NextResponse.json({ success: false, message: 'Failed to create event' }, { status: 500 });
  }
}

