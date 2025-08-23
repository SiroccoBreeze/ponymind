import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

// 检查管理员权限
async function checkAdminPermission() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return { error: '请先登录', status: 401 };
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return { error: '权限不足', status: 403 };
  }

  return { user, status: 200 };
}

interface UserQuery {
  $or?: Array<{ name?: { $regex: string; $options: string }; email?: { $regex: string; $options: string } }>;
  role?: string;
  status?: string;
}

interface UpdateData {
  role?: string;
  status?: string;
  updatedAt: Date;
}

// 创建新用户
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { name, email, password, role, status } = await request.json();

    // 验证必填字段
    if (!name || !email || !password) {
      return NextResponse.json({ error: '用户名、邮箱和密码不能为空' }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 });
    }

    // 创建新用户 - 直接传入明文密码，让pre中间件处理加密
    const newUser = new User({
      name,
      email,
      password: password, // 传入明文密码，让pre中间件加密
      role: role || 'user',
      status: status || 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newUser.save();

    // 返回用户信息（不包含密码）
    const userResponse = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    return NextResponse.json(userResponse, { status: 201 });
  } catch (error) {
    console.error('创建用户失败:', error);
    return NextResponse.json(
      { error: '创建用户失败' },
      { status: 500 }
    );
  }
}

// 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query: UserQuery = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    if (status) {
      query.status = status;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('posts', 'title createdAt');

    const total = await User.countDocuments(query);

    // 获取统计数据
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          adminUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
          },
          bannedUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'banned'] }, 1, 0] }
          }
        }
      }
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        adminUsers: 0,
        bannedUsers: 0
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

// 更新用户
export async function PUT(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { userId, role, status } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 });
    }

    const updateData: UpdateData = {
      updatedAt: new Date()
    };
    
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('更新用户失败:', error);
    return NextResponse.json(
      { error: '更新用户失败' },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 });
    }

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json(
      { error: '删除用户失败' },
      { status: 500 }
    );
  }
} 