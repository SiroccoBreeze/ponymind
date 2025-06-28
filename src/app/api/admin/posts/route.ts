import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';

// 检查管理员权限
async function checkAdminPermission() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return { error: '请先登录', status: 401 };
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return { error: '权限不足', status: 403 };
  }

  return { user, status: 200 };
}

interface PostQuery {
  $or?: Array<{ title?: { $regex: string; $options: string }; content?: { $regex: string; $options: string } }>;
  type?: string;
  status?: string;
  tags?: { $in: string[] };
}

// 获取文章列表
export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const tag = searchParams.get('tag') || '';
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query: PostQuery = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'name email avatar')
      .select('title content type status tags views likes answers createdAt updatedAt author');

    const total = await Post.countDocuments(query);

    // 获取统计数据
    const stats = await Post.aggregate([
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          articles: {
            $sum: { $cond: [{ $eq: ['$type', 'article'] }, 1, 0] }
          },
          questions: {
            $sum: { $cond: [{ $eq: ['$type', 'question'] }, 1, 0] }
          },
          openQuestions: {
            $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
          },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' }
        }
      }
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: stats[0] || {
        totalPosts: 0,
        articles: 0,
        questions: 0,
        openQuestions: 0,
        totalViews: 0,
        totalLikes: 0
      }
    });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    return NextResponse.json(
      { error: '获取文章列表失败' },
      { status: 500 }
    );
  }
}

// 更新文章状态
export async function PUT(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { postId, status, featured } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: '文章ID不能为空' }, { status: 400 });
    }

    const updateData: { status?: string; featured?: boolean; updatedAt: Date } = {
      updatedAt: new Date()
    };
    
    if (status) updateData.status = status;
    if (typeof featured === 'boolean') updateData.featured = featured;

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      updateData,
      { new: true }
    ).populate('author', 'name email avatar');

    if (!updatedPost) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error('更新文章失败:', error);
    return NextResponse.json(
      { error: '更新文章失败' },
      { status: 500 }
    );
  }
}

// 删除文章
export async function DELETE(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: '文章ID不能为空' }, { status: 400 });
    }

    const deletedPost = await Post.findByIdAndDelete(postId);

    if (!deletedPost) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    return NextResponse.json({ message: '文章删除成功' });
  } catch (error) {
    console.error('删除文章失败:', error);
    return NextResponse.json(
      { error: '删除文章失败' },
      { status: 500 }
    );
  }
} 