import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Resource from '@/models/Resource';
import User from '@/models/User';

// 获取单个资源
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

    const resource = await Resource.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    if (!resource) {
      return NextResponse.json({ error: '资源不存在' }, { status: 404 });
    }

    return NextResponse.json(resource);
  } catch (error) {
    console.error('获取资源失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 更新资源
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
    const { name, description, url, category, accessCode, isActive, sortOrder } = body;

    // 验证必填字段
    if (!name || !url || !category) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 检查资源是否存在
    const existingResource = await Resource.findById(id);
    if (!existingResource) {
      return NextResponse.json({ error: '资源不存在' }, { status: 404 });
    }

    // 更新资源
    const updatedResource = await Resource.findByIdAndUpdate(
      id,
      {
        name,
        description: description || '',
        url,
        category,
        accessCode: accessCode || '',
        isActive: isActive !== undefined ? isActive : existingResource.isActive,
        sortOrder: sortOrder !== undefined ? sortOrder : existingResource.sortOrder,
        updatedBy: user._id
      },
      { new: true }
    ).populate('createdBy', 'name email')
     .populate('updatedBy', 'name email')
     .lean();

    return NextResponse.json(updatedResource);
  } catch (error) {
    console.error('更新资源失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 删除资源
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

    // 检查资源是否存在
    const resource = await Resource.findById(id);
    if (!resource) {
      return NextResponse.json({ error: '资源不存在' }, { status: 404 });
    }

    // 删除资源
    await Resource.findByIdAndDelete(id);

    return NextResponse.json({ message: '资源删除成功' });
  } catch (error) {
    console.error('删除资源失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
