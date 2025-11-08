import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ReportCategory from '@/models/ReportCategory';
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

// 获取分类列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = await checkAdminPermission(session);
    if (!user) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    const query: any = {};
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const categories = await ReportCategory.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 创建分类
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = await checkAdminPermission(session);
    if (!user) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { name, description, color, icon, isActive, sortOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '分类名称不能为空' }, { status: 400 });
    }

    // 检查名称是否已存在
    const existing = await ReportCategory.findOne({ name: name.trim() });
    if (existing) {
      return NextResponse.json({ error: '分类名称已存在' }, { status: 400 });
    }

    const category = new ReportCategory({
      name: name.trim(),
      description: description || '',
      color: color || '#3b82f6',
      icon: icon || 'BarChart3',
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
      createdBy: user._id
    });

    await category.save();

    const populatedCategory = await ReportCategory.findById(category._id)
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(populatedCategory, { status: 201 });
  } catch (error) {
    console.error('创建分类失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

