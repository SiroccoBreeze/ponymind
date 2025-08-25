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
    
    const user = await User.findOne({ email }).select('-password');
    
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    
    return NextResponse.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        status: user.status,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('测试用户状态失败:', error);
    return NextResponse.json(
      { error: '获取用户状态失败' },
      { status: 500 }
    );
  }
}
