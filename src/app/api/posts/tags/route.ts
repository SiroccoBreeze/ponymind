import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tag from '@/models/Tag';

// 获取文章标签列表（只显示文章中的使用次数）
export async function GET() {
  try {
    await connectDB();

    // 获取所有活跃的标签，按文章使用量排序
    const tags = await Tag.find({ isActive: true })
      .select('name description color postCount')
      .sort({ postCount: -1, name: 1 })
      .limit(100); // 限制返回数量

    return NextResponse.json({
      tags: tags.map(tag => ({
        _id: tag._id,
        name: tag.name,
        description: tag.description,
        color: tag.color,
        usageCount: tag.postCount || 0 // 只显示文章计数
      }))
    });
  } catch (error) {
    console.error('获取文章标签列表失败:', error);
    return NextResponse.json({ error: '获取文章标签列表失败' }, { status: 500 });
  }
}
