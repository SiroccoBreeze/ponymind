import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Event from '@/models/Event'

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
      return NextResponse.json(
        { success: false, message: '事件不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: event
    })
  } catch (error) {
    console.error('获取事件详情失败:', error)
    return NextResponse.json(
      { success: false, message: '服务器内部错误' },
      { status: 500 }
    )
  }
} 