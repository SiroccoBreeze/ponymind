import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ResourceCategory from '@/models/ResourceCategory';
import User from '@/models/User';

// 获取单个资源分类
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 等待 params 解析
    const { id } = await params;

    const category = await ResourceCategory.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    if (!category) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('获取分类失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 更新资源分类
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 等待 params 解析
    const { id } = await params;

    const body = await request.json();
    const { name, description, color, sortOrder, isActive } = body;

    // 验证必填字段
    if (!name || !name.trim()) {
      return NextResponse.json({ error: '分类名称不能为空' }, { status: 400 });
    }

    // 检查分类是否存在
    const existingCategory = await ResourceCategory.findById(id);
    if (!existingCategory) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    // 检查分类名称是否已被其他分类使用
    const duplicateCategory = await ResourceCategory.findOne({
      name: name.trim(),
      _id: { $ne: id }
    });
    if (duplicateCategory) {
      return NextResponse.json({ error: '分类名称已存在' }, { status: 400 });
    }

    // 更新分类
    const updatedCategory = await ResourceCategory.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: description || '',
        color: color || 'bg-gray-100 text-gray-800',
        sortOrder: sortOrder !== undefined ? sortOrder : existingCategory.sortOrder,
        isActive: isActive !== undefined ? isActive : existingCategory.isActive,
        updatedBy: user._id
      },
      { new: true }
    ).populate('createdBy', 'name email')
     .populate('updatedBy', 'name email')
     .lean();

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('更新分类失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 删除资源分类
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 等待 params 解析
    const { id } = await params;

    // 检查分类是否存在
    const category = await ResourceCategory.findById(id);
    if (!category) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    // 检查是否有资源使用此分类
    const Resource = (await import('@/models/Resource')).default;
    const resourceCount = await Resource.countDocuments({ category: id });
    if (resourceCount > 0) {
      return NextResponse.json({ 
        error: `无法删除分类，还有 ${resourceCount} 个资源使用此分类` 
      }, { status: 400 });
    }

    // 删除分类
    await ResourceCategory.findByIdAndDelete(id);

    return NextResponse.json({ message: '分类删除成功' });
  } catch (error) {
    console.error('删除分类失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
