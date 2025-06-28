import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const post = await Post.findById(params.id)
      .populate('author', 'name email avatar');

    if (!post) {
      return NextResponse.json(
        { error: '内容不存在' },
        { status: 404 }
      );
    }

    // 增加浏览量
    post.views = (post.views || 0) + 1;
    await post.save();

    return NextResponse.json(post);

  } catch (error) {
    console.error('获取内容详情失败:', error);
    return NextResponse.json(
      { error: '获取内容详情失败' },
      { status: 500 }
    );
  }
} 