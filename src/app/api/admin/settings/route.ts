import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

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

// 默认设置
const defaultSettings = {
  siteName: 'PonyMind',
  siteDescription: '技术问答与知识分享的专业平台',
  siteKeywords: '技术,问答,知识分享,编程,开发',
  allowRegistration: true,
  requireEmailVerification: false,
  maxPostsPerDay: 10,
  maxTagsPerPost: 5,
  autoCloseQuestions: false,
  autoCloseAfterDays: 30,
  enableNotifications: true,
  enableEmailNotifications: true,
  moderationMode: 'auto',
  spamFilterEnabled: true,
  maintenanceMode: false,
  maxFileSize: 5,
  allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
  enableComments: true,
  enableLikes: true,
  enableViews: true,
};

// 获取系统设置
export async function GET() {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    // 这里可以从数据库或配置文件中读取设置
    // 目前返回默认设置
    return NextResponse.json({
      settings: defaultSettings
    });
  } catch (error) {
    console.error('获取系统设置失败:', error);
    return NextResponse.json({ error: '获取系统设置失败' }, { status: 500 });
  }
}

// 更新系统设置
export async function PUT(request: Request) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { settings } = await request.json();

    if (!settings) {
      return NextResponse.json({ error: '设置数据不能为空' }, { status: 400 });
    }

    // 验证设置数据
    const validatedSettings = {
      ...defaultSettings,
      ...settings,
      // 确保数值类型正确
      maxPostsPerDay: Math.max(1, Math.min(100, parseInt(settings.maxPostsPerDay) || 10)),
      maxTagsPerPost: Math.max(1, Math.min(20, parseInt(settings.maxTagsPerPost) || 5)),
      autoCloseAfterDays: Math.max(1, Math.min(365, parseInt(settings.autoCloseAfterDays) || 30)),
      maxFileSize: Math.max(1, Math.min(100, parseInt(settings.maxFileSize) || 5)),
    };

    // 这里应该将设置保存到数据库或配置文件
    // 目前只是模拟保存
    console.log('保存系统设置:', validatedSettings);

    return NextResponse.json({
      message: '设置保存成功',
      settings: validatedSettings
    });
  } catch (error) {
    console.error('保存系统设置失败:', error);
    return NextResponse.json({ error: '保存系统设置失败' }, { status: 500 });
  }
} 