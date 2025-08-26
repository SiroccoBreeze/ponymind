import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    await connectDB();

    // 查找用户
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const status = searchParams.get('status'); // all, published, pending, draft, rejected
    const type = searchParams.get('type'); // all, article, question
    const search = searchParams.get('search') || ''; // 搜索关键词

    // 构建查询条件
    const query: Record<string, unknown> = { author: user._id };
    
    if (status && status !== 'all') {
      query.reviewStatus = status;
    }
    
    if (type && type !== 'all') {
      query.type = type;
    }

    // 添加搜索功能
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i'); // 不区分大小写的搜索
      query.$or = [
        { title: searchRegex },           // 标题搜索
        { content: searchRegex },         // 内容搜索
        { tags: searchRegex }             // 标签搜索 - 修复后
      ];
      
      // 添加调试日志
      console.log('🔍 搜索调试信息:');
      console.log('搜索关键词:', search);
      console.log('搜索正则:', searchRegex);
      console.log('构建的查询:', JSON.stringify(query, null, 2));
    }

    const posts = await Post.find(query)
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(query);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取用户文章失败:', error);
    return NextResponse.json(
      { error: '获取用户文章失败' },
      { status: 500 }
    );
  }
} 