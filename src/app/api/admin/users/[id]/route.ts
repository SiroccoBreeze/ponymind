import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Post from '@/models/Post';

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

// 获取单个用户详细信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 });
    }

    await connectDB();
    
    const user = await User.findById(id)
      .select('-password')
      .lean();

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 获取用户发布的文章数量
    const postCount = await Post.countDocuments({ author: id });

    // 将文章数量添加到用户对象中
    const userWithPostCount = {
      ...user,
      posts: Array(postCount).fill(null) // 只保留数量，不包含文章详情
    };

    return NextResponse.json(userWithPostCount);
  } catch (error) {
    console.error('获取用户详情失败:', error);
    return NextResponse.json(
      { error: '获取用户详情失败' },
      { status: 500 }
    );
  }
}

// 更新单个用户信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 });
    }

    const updateData = await request.json();
    const { name, email, bio, location, website, role, status } = updateData;

    // 验证必填字段
    if (!name || !email) {
      return NextResponse.json({ error: '用户名和邮箱不能为空' }, { status: 400 });
    }

    // 检查邮箱是否已被其他用户使用
    const existingUser = await User.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      return NextResponse.json({ error: '该邮箱已被其他用户使用' }, { status: 400 });
    }

    await connectDB();
    
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        name,
        email,
        bio,
        location,
        website,
        role,
        status,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 获取用户发布的文章数量
    const postCount = await Post.countDocuments({ author: id });

    // 将文章数量添加到用户对象中
    const userWithPostCount = {
      ...updatedUser.toObject(),
      posts: Array(postCount).fill(null) // 只保留数量，不包含文章详情
    };

    return NextResponse.json(userWithPostCount);
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return NextResponse.json(
      { error: '更新用户信息失败' },
      { status: 500 }
    );
  }
}
