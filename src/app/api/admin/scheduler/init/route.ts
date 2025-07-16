import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { startScheduler } from '@/lib/init-scheduler';

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

// 初始化调度器
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    // 启动调度器
    await startScheduler();
    
    return NextResponse.json({ message: '调度器初始化成功' });
  } catch (error) {
    console.error('初始化调度器失败:', error);
    return NextResponse.json(
      { error: '初始化调度器失败' },
      { status: 500 }
    );
  }
} 