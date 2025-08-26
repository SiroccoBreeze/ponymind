import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tag from '@/models/Tag';

// 获取事件标签列表（只显示事件中的使用次数）
export async function GET() {
  try {
    await connectDB();

    // 获取所有活跃的标签，按事件使用量排序
    const tags = await Tag.find({ isActive: true })
      .select('name description color eventCount')
      .sort({ eventCount: -1, name: 1 })
      .limit(100); // 限制返回数量

    return NextResponse.json({
      tags: tags.map(tag => ({
        _id: tag._id,
        name: tag.name,
        description: tag.description,
        color: tag.color,
        usageCount: tag.eventCount || 0 // 只显示事件计数
      }))
    });
  } catch (error) {
    console.error('获取事件标签列表失败:', error);
    return NextResponse.json({ error: '获取事件标签列表失败' }, { status: 500 });
  }
}
