import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ReportCategory from '@/models/ReportCategory';

// 获取报表分类列表（用户端）
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    const query: any = { isActive: true };
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const categories = await ReportCategory.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

