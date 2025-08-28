import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { updateInactiveUsers } from '@/lib/improved-cleanup';

export async function POST(request: NextRequest) {
  try {
    // 验证会话
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '需要登录才能执行此操作' },
        { status: 401 }
      );
    }

    console.log('🔄 手动执行更新非活跃用户状态任务...');
    
    // 执行更新非活跃用户状态
    const result = await updateInactiveUsers();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        details: result.details
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        details: result.details
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ 更新非活跃用户状态失败:', error);
    return NextResponse.json(
      { error: '更新非活跃用户状态失败' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 验证会话
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '需要登录才能查看此信息' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '更新非活跃用户状态API',
      description: '此API用于手动执行更新非活跃用户状态的任务',
      usage: 'POST /api/admin/update-inactive-users',
      schedule: '每天凌晨3点自动执行',
      criteria: '将半个月内未登录的用户状态设置为非活跃'
    });

  } catch (error) {
    console.error('❌ 获取API信息失败:', error);
    return NextResponse.json(
      { error: '获取API信息失败' },
      { status: 500 }
    );
  }
}
