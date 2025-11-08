import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ReportCategory from '@/models/ReportCategory';
import Report from '@/models/Report';
import User from '@/models/User';

// 检查管理员权限
async function checkAdminPermission(session: any) {
  if (!session?.user?.email) {
    return null;
  }
  const user = await User.findOne({ email: session.user.email });
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return null;
  }
  return user;
}

// 获取单个分类
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = await checkAdminPermission(session);
    if (!user) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const category = await ReportCategory.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    if (!category) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('获取分类详情失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 更新分类
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = await checkAdminPermission(session);
    if (!user) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const category = await ReportCategory.findById(id);
    if (!category) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, color, icon, isActive, sortOrder } = body;

    if (name && name.trim() && name.trim() !== category.name) {
      // 检查新名称是否已存在
      const existing = await ReportCategory.findOne({ name: name.trim() });
      if (existing) {
        return NextResponse.json({ error: '分类名称已存在' }, { status: 400 });
      }
      category.name = name.trim();
    }

    if (description !== undefined) category.description = description;
    if (color !== undefined) category.color = color;
    if (icon !== undefined) category.icon = icon;
    if (isActive !== undefined) category.isActive = isActive;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    category.updatedBy = user._id;

    await category.save();

    const populatedCategory = await ReportCategory.findById(category._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    return NextResponse.json(populatedCategory);
  } catch (error) {
    console.error('更新分类失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 删除分类
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = await checkAdminPermission(session);
    if (!user) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const category = await ReportCategory.findById(id);
    if (!category) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    // 检查是否有报表使用此分类
    const reportCount = await Report.countDocuments({ category: id });
    if (reportCount > 0) {
      return NextResponse.json(
        { error: `该分类下还有 ${reportCount} 个报表，无法删除` },
        { status: 400 }
      );
    }

    await ReportCategory.findByIdAndDelete(id);

    return NextResponse.json({ message: '分类删除成功' });
  } catch (error) {
    console.error('删除分类失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

