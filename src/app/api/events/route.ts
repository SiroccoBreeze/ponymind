import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import Image from '@/models/Image';
import { getServerSession } from 'next-auth/next';
import { moveAttachmentToEvent } from '@/lib/minio';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = Number(searchParams.get('limit') || '200');

    const query: Record<string, unknown> = {};
    if (category) query.category = category;
    if (status) query.status = status;

    const events = await Event.find(query)
      .setOptions({ strictPopulate: false })
      .sort({ occurredAt: -1 })
      .limit(limit)
      .populate({ path: 'attachments', select: 'originalName url size mimetype' })
      .populate({ path: 'creator', select: 'name avatar email' });

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('GET /api/events error', error);
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

    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
    }

    const body = await req.json();
    const { title, description = '', category = 'other', status = 'planned', occurredAt, attachments = [] } = body;

    if (!title || !occurredAt) {
      return NextResponse.json({ success: false, message: 'title 与 occurredAt 为必填' }, { status: 400 });
    }

    // 过滤并校验附件ID格式
    const validAttachmentIds = Array.isArray(attachments)
      ? attachments.filter((id: string) => typeof id === 'string')
      : [];

    const created = await Event.create({
      title,
      description,
      category,
      status,
      occurredAt: new Date(occurredAt),
      creator: user._id,
      attachments: validAttachmentIds,
    });

    if (validAttachmentIds.length > 0) {
      console.log(`🔍 开始处理 ${validAttachmentIds.length} 个附件...`);
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
                updatedAt: new Date()
              }
            });
            
            console.log(`💾 数据库更新成功: ${attachment._id} -> ${newObjectName}`);
          } catch (moveError) {
            console.error(`❌ 移动附件 ${attachment._id} 失败:`, moveError);
            // 即使移动失败，也要标记为已使用
            await Image.findByIdAndUpdate(attachment._id, {
              $set: {
                isUsed: true,
                associatedPost: created._id,
                updatedAt: new Date()
              }
            });
          }
        }
      } catch (e) {
        console.error('❌ 处理附件失败', e);
      }
    }

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('POST /api/events error', error);
    return NextResponse.json({ success: false, message: 'Failed to create event' }, { status: 500 });
  }
}

