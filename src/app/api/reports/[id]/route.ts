import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Report from '@/models/Report';

// 获取单个报表详情（用户端）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const report = await Report.findOne({
      _id: id,
      isActive: true
    })
      .populate('category', 'name color icon description')
      .populate('createdBy', 'name email')
      .lean();

    if (!report) {
      return NextResponse.json({ error: '报表不存在或已禁用' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('获取报表详情失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

