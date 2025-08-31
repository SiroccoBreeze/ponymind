import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import UserGroup from '@/models/UserGroup';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // 构建查询条件
    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // 获取用户组列表
    const userGroups = await UserGroup.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    // 获取总数
    const total = await UserGroup.countDocuments(query);

    // 获取统计信息
    const stats = await UserGroup.aggregate([
      {
        $group: {
          _id: null,
          totalGroups: { $sum: 1 },
          totalMembers: { $sum: '$memberCount' }
        }
      }
    ]);

    const activeGroups = await UserGroup.countDocuments({ memberCount: { $gt: 0 } });

    return NextResponse.json({
      userGroups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalGroups: stats[0]?.totalGroups || 0,
        totalMembers: stats[0]?.totalMembers || 0,
        activeGroups
      }
    });

  } catch (error) {
    console.error('获取用户组列表失败:', error);
    return NextResponse.json({ error: '获取用户组列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, description, permissions } = body;

    // 验证必填字段
    if (!name || !name.trim()) {
      return NextResponse.json({ error: '用户组名称不能为空' }, { status: 400 });
    }

    // 检查用户组名称是否已存在
    const existingGroup = await UserGroup.findOne({ name: name.trim() });
    if (existingGroup) {
      return NextResponse.json({ error: '用户组名称已存在' }, { status: 400 });
    }

    // 创建用户组
    const newGroup = new UserGroup({
      name: name.trim(),
      description: description || '',
      permissions: permissions || [],
      members: [],
      createdBy: user._id,
      isActive: true
    });

    const result = await newGroup.save();

    return NextResponse.json({
      message: '用户组创建成功',
      groupId: result.insertedId
    }, { status: 201 });

  } catch (error) {
    console.error('创建用户组失败:', error);
    return NextResponse.json({ error: '创建用户组失败' }, { status: 500 });
  }
}
