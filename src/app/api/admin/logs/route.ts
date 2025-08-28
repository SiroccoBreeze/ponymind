import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Log from '@/models/Log';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const level = searchParams.get('level');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    await connectDB();

    const query: Record<string, any> = {};
    if (level) query.level = level;
    if (category) query.category = category;
    
    if (startDate || endDate) {
      query.timestamp = {} as Record<string, Date>;
      if (startDate) {
        // 设置开始时间为当天的 00:00:00
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);
        query.timestamp.$gte = startDateTime;
      }
      if (endDate) {
        // 设置结束时间为当天的 23:59:59.999
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.timestamp.$lte = endDateTime;
      }
    }
    
    if (search) {
      query.$or = [
        { message: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      Log.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      Log.countDocuments(query)
    ]);

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });

  } catch (error) {
    logger.error('获取日志失败', error);
    return NextResponse.json({ error: '获取日志失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    await connectDB();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await Log.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    logger.admin('清理日志', session.user.id, session.user.email, {
      days,
      deletedCount: result.deletedCount
    });

    return NextResponse.json({
      message: `成功删除 ${result.deletedCount} 条日志`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    logger.error('删除日志失败', error);
    return NextResponse.json({ error: '删除日志失败' }, { status: 500 });
  }
}
