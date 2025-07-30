import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    // 验证会话
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '需要登录才能获取用户资料' },
        { status: 401 }
      );
    }

    await connectDB();

    // 查找用户
    const user = await User.findOne({ email: session.user.email })
      .select('name email avatar bio location website createdAt updatedAt');

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      avatar: user.avatar || '',
      bio: user.bio || '',
      location: user.location || '',
      website: user.website || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });

  } catch (error) {
    console.error('❌ 获取用户资料失败:', error);
    return NextResponse.json(
      { error: '获取用户资料失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 验证会话
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '需要登录才能更新用户资料' },
        { status: 401 }
      );
    }

    await connectDB();

    // 获取请求数据
    const { bio, location, website } = await request.json();

    // 查找用户
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 更新用户资料
    const updateData: any = {
      updatedAt: new Date()
    };

    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;

    await User.findByIdAndUpdate(user._id, updateData);

    // 返回更新后的用户资料
    const updatedUser = await User.findById(user._id)
      .select('name email avatar bio location website createdAt updatedAt');

    return NextResponse.json({
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar || '',
      bio: updatedUser.bio || '',
      location: updatedUser.location || '',
      website: updatedUser.website || '',
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    });

  } catch (error) {
    console.error('❌ 更新用户资料失败:', error);
    return NextResponse.json(
      { error: '更新用户资料失败' },
      { status: 500 }
    );
  }
} 