import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Post from '@/models/Post';
import User from '@/models/User';

// 获取评论列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 检查管理员权限
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // 构建查询条件
    const query: any = {};

    // 搜索条件
    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }

    // 状态筛选
    if (status === 'accepted') {
      query.isAccepted = true;
    } else if (status === 'not-accepted') {
      query.isAccepted = { $ne: true };
    }

    // 类型筛选
    if (type !== 'all') {
      // 需要先通过 post 类型筛选
      const postIds = await Post.find({ type }).distinct('_id');
      query.post = { $in: postIds };
    }

    // 计算总数
    const total = await Comment.countDocuments(query);

    // 构建排序条件
    let sort: any = {};
    if (sortBy === 'author') {
      // 按作者排序需要先聚合
      const comments = await Comment.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'authorInfo'
          }
        },
        { $unwind: '$authorInfo' },
        { $sort: { 'authorInfo.name': sortOrder === 'asc' ? 1 : -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
      ]);

      return NextResponse.json({
        success: true,
        comments: comments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } else {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // 获取评论列表
    const comments = await Comment.find(query)
      .populate('author', 'name email avatar')
      .populate('post', 'title type')
      .populate('parentComment', 'author')
      .populate({
        path: 'parentComment',
        populate: {
          path: 'author',
          select: 'name'
        }
      })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('获取评论列表失败:', error);
    return NextResponse.json(
      { error: '获取评论列表失败' },
      { status: 500 }
    );
  }
} 