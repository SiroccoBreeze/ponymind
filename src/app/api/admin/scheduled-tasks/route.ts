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

// 获取所有定时任务
export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const tasks = await scheduler.getAllTasks();
    
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('获取定时任务失败:', error);
    return NextResponse.json(
      { error: '获取定时任务失败' },
      { status: 500 }
    );
  }
}

// 创建新的定时任务
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const taskData = await request.json();
    
    // 验证必填字段
    if (!taskData.name || !taskData.description || !taskData.taskType || !taskData.schedule) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const task = await scheduler.createTask(taskData);
    
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('创建定时任务失败:', error);
    return NextResponse.json(
      { error: '创建定时任务失败' },
      { status: 500 }
    );
  }
}

// 更新定时任务
export async function PUT(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { taskId, ...updateData } = await request.json();
    
    if (!taskId) {
      return NextResponse.json({ error: '任务ID不能为空' }, { status: 400 });
    }

    const task = await scheduler.updateTask(taskId, updateData);
    
    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('更新定时任务失败:', error);
    return NextResponse.json(
      { error: '更新定时任务失败' },
      { status: 500 }
    );
  }
}

// 删除定时任务
export async function DELETE(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: '任务ID不能为空' }, { status: 400 });
    }

    const task = await scheduler.deleteTask(taskId);
    
    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    return NextResponse.json({ message: '任务删除成功' });
  } catch (error) {
    console.error('删除定时任务失败:', error);
    return NextResponse.json(
      { error: '删除定时任务失败' },
      { status: 500 }
    );
  }
} 