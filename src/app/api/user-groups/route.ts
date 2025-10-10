import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { getUserAccessibleGroups } from '@/lib/permissions';

// 获取用户可访问的用户组列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    await connectDB();

    const userGroups = await getUserAccessibleGroups(session.user.email);

    return NextResponse.json({
      success: true,
      data: userGroups
    });
  } catch (error) {
    console.error('获取用户组列表失败:', error);
    return NextResponse.json({ error: '获取用户组列表失败' }, { status: 500 });
  }
}
