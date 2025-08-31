import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import UserGroup from '@/models/UserGroup';

// 获取单个用户组
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 检查用户是否有管理员权限
    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id } = params;

    // 获取用户组信息
    const userGroup = await UserGroup.findById(id);
    if (!userGroup) {
      return NextResponse.json({ error: '用户组不存在' }, { status: 404 });
    }

    return NextResponse.json({ userGroup });

  } catch (error) {
    console.error('获取用户组失败:', error);
    return NextResponse.json({ error: '获取用户组失败' }, { status: 500 });
  }
}

// 更新用户组
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 检查用户是否有管理员权限
    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, description, permissions } = body;

    // 验证必填字段
    if (!name || !name.trim()) {
      return NextResponse.json({ error: '用户组名称不能为空' }, { status: 400 });
    }

    // 检查用户组是否存在
    const existingGroup = await UserGroup.findById(id);
    if (!existingGroup) {
      return NextResponse.json({ error: '用户组不存在' }, { status: 404 });
    }

    // 如果要更新名称，检查是否与其他组重复
    if (name.trim() !== existingGroup.name) {
      const nameExists = await UserGroup.findOne({ 
        name: name.trim(), 
        _id: { $ne: id } 
      });
      if (nameExists) {
        return NextResponse.json({ error: '用户组名称已存在' }, { status: 400 });
      }
    }

    // 更新用户组
    const updatedGroup = await UserGroup.findByIdAndUpdate(
      id,
      { 
        $set: {
          name: name.trim(),
          description: description || '',
          permissions: permissions || []
        }
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      message: '用户组更新成功',
      userGroup: updatedGroup
    });

  } catch (error) {
    console.error('更新用户组失败:', error);
    return NextResponse.json({ error: '更新用户组失败' }, { status: 500 });
  }
}

// 删除用户组
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 检查用户是否有管理员权限
    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id } = params;

    // 检查用户组是否存在
    const existingGroup = await UserGroup.findById(id);
    if (!existingGroup) {
      return NextResponse.json({ error: '用户组不存在' }, { status: 404 });
    }

    // 检查是否有成员
    if (existingGroup.members.length > 0) {
      return NextResponse.json({ 
        error: '无法删除包含成员的用户组，请先移除所有成员' 
      }, { status: 400 });
    }

    // 删除用户组
    await UserGroup.findByIdAndDelete(id);

    return NextResponse.json({
      message: '用户组删除成功'
    });

  } catch (error) {
    console.error('删除用户组失败:', error);
    return NextResponse.json({ error: '删除用户组失败' }, { status: 500 });
  }
}
