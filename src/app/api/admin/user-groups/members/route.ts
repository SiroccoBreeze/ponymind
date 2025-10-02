import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import UserGroup from '@/models/UserGroup';
import User from '@/models/User';

// 添加用户到用户组
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { groupId, userId } = body;

    if (!groupId || !userId) {
      return NextResponse.json({ error: '用户组ID和用户ID不能为空' }, { status: 400 });
    }

    const userGroup = await UserGroup.findById(groupId);
    if (!userGroup) {
      return NextResponse.json({ error: '用户组不存在' }, { status: 404 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 检查用户是否已经在用户组中
    if (userGroup.members.includes(userId)) {
      return NextResponse.json({ error: '用户已在该用户组中' }, { status: 400 });
    }

    // 添加用户到用户组
    await UserGroup.findByIdAndUpdate(groupId, {
      $addToSet: { members: userId }
    });

    // 添加用户组到用户
    await User.findByIdAndUpdate(userId, {
      $addToSet: { userGroups: groupId }
    });

    const updatedGroup = await UserGroup.findById(groupId)
      .populate('createdBy', 'name email')
      .populate('members', 'name email avatar')
      .lean();

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error('添加用户到用户组失败:', error);
    return NextResponse.json({ error: '添加用户到用户组失败' }, { status: 500 });
  }
}

// 从用户组中移除用户
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const userId = searchParams.get('userId');

    if (!groupId || !userId) {
      return NextResponse.json({ error: '用户组ID和用户ID不能为空' }, { status: 400 });
    }

    const userGroup = await UserGroup.findById(groupId);
    if (!userGroup) {
      return NextResponse.json({ error: '用户组不存在' }, { status: 404 });
    }

    // 从用户组中移除用户
    await UserGroup.findByIdAndUpdate(groupId, {
      $pull: { members: userId }
    });

    // 从用户中移除用户组
    await User.findByIdAndUpdate(userId, {
      $pull: { userGroups: groupId }
    });

    const updatedGroup = await UserGroup.findById(groupId)
      .populate('createdBy', 'name email')
      .populate('members', 'name email avatar')
      .lean();

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error('从用户组中移除用户失败:', error);
    return NextResponse.json({ error: '从用户组中移除用户失败' }, { status: 500 });
  }
}
