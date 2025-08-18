import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ResourceCategory from '@/models/ResourceCategory';
import User from '@/models/User';

// 获取资源分类列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 检查管理员权限
    const user = await User.findOne({ email: session.user.email });
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // 构建查询条件
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // 执行查询
    const [categories, total] = await Promise.all([
      ResourceCategory.find(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ResourceCategory.countDocuments(query)
    ]);

    return NextResponse.json({
      categories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取资源分类列表失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 创建资源分类
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 检查管理员权限
    const user = await User.findOne({ email: session.user.email });
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { name, description, color, sortOrder, isActive } = body;

    // 验证必填字段
    if (!name || !name.trim()) {
      return NextResponse.json({ error: '分类名称不能为空' }, { status: 400 });
    }

    // 检查分类名称是否已存在
    const existingCategory = await ResourceCategory.findOne({ name: name.trim() });
    if (existingCategory) {
      return NextResponse.json({ error: '分类名称已存在' }, { status: 400 });
    }

    // 创建分类
    const category = new ResourceCategory({
      name: name.trim(),
      description: description || '',
      color: color || 'bg-gray-100 text-gray-800',
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: user._id
    });

    await category.save();

    const populatedCategory = await ResourceCategory.findById(category._id)
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(populatedCategory, { status: 201 });
  } catch (error) {
    console.error('创建资源分类失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
