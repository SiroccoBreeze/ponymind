import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tag from '@/models/Tag';

// 获取公共标签列表（不需要管理员权限）
export async function GET() {
  try {
    await connectDB();

    // 获取所有活跃的标签，按使用量排序
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
        usageCount: tag.postCount
      }))
    });
  } catch (error) {
    console.error('获取标签列表失败:', error);
    return NextResponse.json({ error: '获取标签列表失败' }, { status: 500 });
  }
} 