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

// 修改用户密码
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { userId, newPassword } = await request.json();

    // 验证必填字段
    if (!userId || !newPassword) {
      return NextResponse.json({ error: '用户ID和新密码不能为空' }, { status: 400 });
    }

    // 验证密码长度
    if (newPassword.length < 6) {
      return NextResponse.json({ error: '密码长度至少6位' }, { status: 400 });
    }

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 更新用户密码 - 使用updateOne避免触发pre中间件
    await User.updateOne(
      { _id: userId },
      { 
        password: hashedPassword,
        updatedAt: new Date()
      }
    );

    return NextResponse.json({ 
      message: '密码修改成功',
      userId: user._id,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('修改密码失败:', error);
    return NextResponse.json(
      { error: '修改密码失败' },
      { status: 500 }
    );
  }
}
