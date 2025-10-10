import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import UserGroup from '@/models/UserGroup';
import User from '@/models/User';

// 获取用户组列表或单个用户组
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    
    // 如果提供了groupId，返回单个用户组
    if (groupId) {
      const userGroup = await UserGroup.findById(groupId)
        .populate('createdBy', 'name email')
        .populate('members', 'name email avatar')
        .lean();
      
      if (!userGroup) {
        return NextResponse.json({ error: '用户组不存在' }, { status: 404 });
      }
      
      // 添加成员数量
      const userGroupWithMemberCount = {
        ...userGroup,
        memberCount: (userGroup as any).members ? (userGroup as any).members.length : 0
      };
      
      return NextResponse.json(userGroupWithMemberCount);
    }

    // 否则返回用户组列表
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [userGroups, total] = await Promise.all([
      UserGroup.find(query)
        .populate('createdBy', 'name email')
        .populate('members', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserGroup.countDocuments(query)
    ]);

    // 为每个用户组添加成员数量
    const userGroupsWithMemberCount = userGroups.map(group => ({
      ...group,
      memberCount: (group as any).members ? (group as any).members.length : 0
    }));

    const stats = await Promise.all([
      UserGroup.countDocuments(),
      UserGroup.countDocuments({ isActive: true }),
      User.countDocuments()
    ]);

    return NextResponse.json({
      userGroups: userGroupsWithMemberCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalGroups: stats[0],
        activeGroups: stats[1],
        totalUsers: stats[2]
      }
    });
  } catch (error) {
    console.error('获取用户组失败:', error);
    return NextResponse.json({ error: '获取用户组失败' }, { status: 500 });
  }
}

// 创建用户组
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { name, description, permissions, color, icon } = body;

    if (!name) {
      return NextResponse.json({ error: '用户组名称不能为空' }, { status: 400 });
    }

    // 检查用户组名称是否已存在
    const existingGroup = await UserGroup.findOne({ name });
    if (existingGroup) {
      return NextResponse.json({ error: '用户组名称已存在' }, { status: 400 });
    }

    const userGroup = new UserGroup({
      name,
      description: description || '',
      permissions: permissions || [],
      color: color || '#3b82f6',
      icon: icon || 'users',
      createdBy: session.user.id,
      members: []
    });

    await userGroup.save();

    const populatedGroup = await UserGroup.findById(userGroup._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email avatar')
      .lean();

    return NextResponse.json(populatedGroup, { status: 201 });
  } catch (error) {
    console.error('创建用户组失败:', error);
    return NextResponse.json({ error: '创建用户组失败' }, { status: 500 });
  }
}

// 更新用户组
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { groupId, name, description, permissions, color, icon, isActive } = body;

    if (!groupId) {
      return NextResponse.json({ error: '用户组ID不能为空' }, { status: 400 });
    }

    const userGroup = await UserGroup.findById(groupId);
    if (!userGroup) {
      return NextResponse.json({ error: '用户组不存在' }, { status: 404 });
    }

    // 如果更新名称，检查是否与其他用户组重名
    if (name && name !== userGroup.name) {
      const existingGroup = await UserGroup.findOne({ name, _id: { $ne: groupId } });
      if (existingGroup) {
        return NextResponse.json({ error: '用户组名称已存在' }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (isActive !== undefined) updateData.isActive = isActive;

    await UserGroup.findByIdAndUpdate(groupId, updateData);

    const updatedGroup = await UserGroup.findById(groupId)
      .populate('createdBy', 'name email')
      .populate('members', 'name email avatar')
      .lean();

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error('更新用户组失败:', error);
    return NextResponse.json({ error: '更新用户组失败' }, { status: 500 });
  }
}

// 删除用户组
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: '用户组ID不能为空' }, { status: 400 });
    }

    const userGroup = await UserGroup.findById(groupId);
    if (!userGroup) {
      return NextResponse.json({ error: '用户组不存在' }, { status: 404 });
    }

    // 检查是否有用户属于该用户组
    const usersInGroup = await User.countDocuments({ userGroups: groupId });
    if (usersInGroup > 0) {
      return NextResponse.json({ error: '该用户组中还有用户，无法删除' }, { status: 400 });
    }

    await UserGroup.findByIdAndDelete(groupId);

    return NextResponse.json({ message: '用户组删除成功' });
  } catch (error) {
    console.error('删除用户组失败:', error);
    return NextResponse.json({ error: '删除用户组失败' }, { status: 500 });
  }
}