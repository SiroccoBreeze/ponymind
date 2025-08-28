import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Event from '@/models/Event'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await connectDB()
    
    const event = await Event.findById(id)
      .setOptions({ strictPopulate: false })
      .populate('attachments', 'originalName url size mimetype')
      .populate('creator', 'name avatar email')
    
    if (!event) {
      // 记录事件不存在日志
      logger.warn('事件不存在', {
        operation: 'get_event_detail',
        eventId: id,
        context: '尝试获取不存在的事件详情'
      });
      
      return NextResponse.json(
        { success: false, message: '事件不存在' },
        { status: 404 }
      )
    }

    // 记录事件详情获取成功日志
    logger.event('获取事件详情成功', event.creator?.toString(), undefined, {
      operation: 'get_event_detail',
      eventId: id,
      eventTitle: event.title,
      eventStatus: event.status
    });

    return NextResponse.json({
      success: true,
      data: event
    })
  } catch (error) {
    console.error('获取事件详情失败:', error)
    
    // 记录获取事件详情失败日志
    logger.error('获取事件详情失败', error, {
      operation: 'get_event_detail',
      eventId: id,
      context: '获取事件详情时发生错误'
    });
    
    return NextResponse.json(
      { success: false, message: '服务器内部错误' },
      { status: 500 }
    )
  }
} 