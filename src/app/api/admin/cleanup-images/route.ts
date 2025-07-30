import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { improvedCleanupUnusedImages, safeCleanupTempImages } from '@/lib/improved-cleanup';

export async function POST(request: NextRequest) {
  try {
    // 验证会话
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '需要登录才能执行清理操作' },
        { status: 401 }
      );
    }

    const { type = 'unused' } = await request.json();

    let result;
    
    if (type === 'temp') {
      // 只清理临时图片
      result = await safeCleanupTempImages();
    } else {
      // 清理所有未使用的图片
      result = await improvedCleanupUnusedImages();
    }

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
    console.error('❌ 清理操作失败:', error);
    return NextResponse.json(
      { error: '清理操作失败' },
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
        { error: '需要登录才能查看清理信息' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'unused';

    // 这里可以返回清理统计信息
    return NextResponse.json({
      success: true,
      message: '清理功能可用',
      availableTypes: ['unused', 'temp'],
      currentType: type,
      description: {
        unused: '清理所有未使用的图片（包括头像和文章图片）',
        temp: '只清理临时图片（temp目录下的图片）'
      }
    });

  } catch (error) {
    console.error('❌ 获取清理信息失败:', error);
    return NextResponse.json(
      { error: '获取清理信息失败' },
      { status: 500 }
    );
  }
} 