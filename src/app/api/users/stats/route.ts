import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';

export async function GET() {
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

    // 统计用户数据
    const stats = await Post.aggregate([
      {
        $match: { author: user._id }
      },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalArticles: {
            $sum: { $cond: [{ $eq: ['$type', 'article'] }, 1, 0] }
          },
          totalQuestions: {
            $sum: { $cond: [{ $eq: ['$type', 'question'] }, 1, 0] }
          },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          drafts: {
            $sum: { $cond: [{ $eq: ['$reviewStatus', 'draft'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$reviewStatus', 'pending'] }, 1, 0] }
          },
          published: {
            $sum: { $cond: [{ $eq: ['$reviewStatus', 'published'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$reviewStatus', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalPosts: 0,
      totalArticles: 0,
      totalQuestions: 0,
      totalViews: 0,
      totalLikes: 0,
      drafts: 0,
      pending: 0,
      published: 0,
      rejected: 0
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('获取用户统计失败:', error);
    return NextResponse.json(
      { error: '获取用户统计失败' },
      { status: 500 }
    );
  }
} 