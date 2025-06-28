import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import os from 'os';

// 检查管理员权限
async function checkAdminPermission() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return { error: '请先登录', status: 401 };
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user || user.role !== 'admin') {
    return { error: '权限不足', status: 403 };
  }

  return { user, status: 200 };
}

// 获取系统信息
export async function GET() {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const systemInfo = {
      version: 'v1.0.0',
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      uptime: Math.floor(process.uptime() / 3600), // 小时
      memoryUsage: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
      },
      cpuUsage: os.loadavg(),
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024), // GB
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({ systemInfo });
  } catch (error) {
    console.error('获取系统信息失败:', error);
    return NextResponse.json({ error: '获取系统信息失败' }, { status: 500 });
  }
} 