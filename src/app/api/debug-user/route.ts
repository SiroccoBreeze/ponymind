import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: '请提供邮箱参数' }, { status: 400 });
    }
    
    // 查找用户，包含所有字段
    const user = await User.findOne({ email });
    
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    
    // 返回完整的用户信息（除了密码）
    return NextResponse.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        status: user.status,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        website: user.website,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        posts: user.posts,
        likedPosts: user.likedPosts
      },
      debug: {
        statusType: typeof user.status,
        statusValue: user.status,
        statusComparison: {
          isBanned: user.status === 'banned',
          isInactive: user.status === 'inactive',
          isActive: user.status === 'active'
        },
        rawStatus: user.status
      }
    });
  } catch (error) {
    console.error('调试用户信息失败:', error);
    return NextResponse.json(
      { error: '获取用户信息失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
