import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Resource from '@/models/Resource';
import ResourceCategory from '@/models/ResourceCategory';
import User from '@/models/User';

// 获取管理端资源列表
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
    const type = searchParams.get('type') || '';
    const category = searchParams.get('category') || '';
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
    
    if (category) {
      // 直接使用分类ID
      query.category = category;
    }
    
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // 执行查询
    const [resources, total] = await Promise.all([
      Resource.find(query)
        .populate('category', 'name color')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Resource.countDocuments(query)
    ]);

    return NextResponse.json({
      resources,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取资源列表失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 创建资源
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
    const { name, description, url, category, accessCode, isActive, sortOrder } = body;

    // 验证必填字段
    if (!name || !url || !category) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 验证分类是否存在
    const categoryDoc = await ResourceCategory.findById(category);
    if (!categoryDoc) {
      return NextResponse.json({ error: '选择的分类不存在' }, { status: 400 });
    }

    // 创建资源
    const resource = new Resource({
      name: name.trim(),
      description: description || '',
      url: url.trim(),
      category: categoryDoc._id,
      accessCode: accessCode || '',
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
      createdBy: user._id
    });

    await resource.save();

    const populatedResource = await Resource.findById(resource._id)
      .populate('category', 'name color')
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(populatedResource, { status: 201 });
  } catch (error) {
    console.error('创建资源失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
