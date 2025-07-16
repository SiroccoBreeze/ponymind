import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import scheduler from '@/lib/scheduler';

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

// 手动执行定时任务
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { taskId } = await request.json();
    
    if (!taskId) {
      return NextResponse.json({ error: '任务ID不能为空' }, { status: 400 });
    }

    const result = await scheduler.runTaskManually(taskId);
    
    return NextResponse.json({ result });
  } catch (error) {
    console.error('手动执行任务失败:', error);
    return NextResponse.json(
      { error: '手动执行任务失败' },
      { status: 500 }
    );
  }
} 