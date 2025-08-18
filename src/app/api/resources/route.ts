import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Resource from '@/models/Resource';
import ResourceCategory from '@/models/ResourceCategory';

// 获取前台资源列表
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const skip = (page - 1) * limit;

    // 构建查询条件 - 只查询激活状态的资源
    const query: any = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      // 直接使用分类ID
      query.category = category;
    }

    // 执行查询
    const [resources, total] = await Promise.all([
      Resource.find(query)
        .populate('category', 'name color')
        .select('-createdBy -updatedBy') // 不返回创建者和更新者信息
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Resource.countDocuments(query)
    ]);

    // 获取所有可用的分类（用于筛选）
    const categories = await ResourceCategory.find({ isActive: true })
      .select('name')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return NextResponse.json({
      resources,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        categories: categories.map(cat => cat.name)
      }
    });
  } catch (error) {
    console.error('获取资源列表失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
