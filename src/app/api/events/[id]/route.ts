import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import connectDB from '@/lib/mongodb'
import Event from '@/models/Event'
import User from '@/models/User'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await connectDB()
    
    // 检查用户登录状态
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: '需要登录才能查看事件详情' },
        { status: 401 }
      )
    }

    // 获取用户信息
    const user = await User.findOne({ email: session.user.email }).populate('userGroups')
    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    const event = await Event.findById(id)
      .setOptions({ strictPopulate: false })
      .populate('attachments', 'originalName url size mimetype')
      .populate('creator', 'name avatar email')
      .populate('userGroup', 'name color')
    
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

    // 检查用户组权限：只有同一用户组的用户才能查看事件
    const userGroupIds = user.userGroups?.map((group: any) => group._id.toString()) || []
    const eventUserGroupId = event.userGroup?._id?.toString()
    
    // 管理员可以查看所有事件
    if (user.role !== 'admin' && (!eventUserGroupId || !userGroupIds.includes(eventUserGroupId))) {
      logger.warn('用户尝试访问无权限的事件', {
        operation: 'get_event_detail',
        eventId: id,
        userId: user._id.toString(),
        userEmail: user.email,
        eventUserGroupId,
        userGroupIds,
        context: '用户组权限检查失败'
      });
      
      return NextResponse.json(
        { success: false, message: '您没有权限查看此事件' },
        { status: 403 }
      )
    }

    // 记录事件详情获取成功日志
    logger.event('获取事件详情成功', event.creator?.toString(), undefined, {
      operation: 'get_event_detail',
      eventId: id,
      eventTitle: event.title,
      eventStatus: event.status,
      userGroupId: eventUserGroupId
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