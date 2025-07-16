import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import { deletePostWithCascade } from '@/lib/cascade-delete';

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
  reviewStatus?: string;
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
    const reviewStatus = searchParams.get('reviewStatus') || '';
    const tag = searchParams.get('tag') || '';
    const isAdminMode = searchParams.get('admin') === 'true';
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query: PostQuery = {};
    
    // 如果不是管理员模式，只显示已发布的内容
    if (!isAdminMode) {
      query.reviewStatus = 'published';
    } else {
      // 管理员模式：不显示草稿状态
      if (!reviewStatus) {
        query.reviewStatus = { $ne: 'draft' } as any;
      }
    }
    
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
    
    if (reviewStatus) {
      query.reviewStatus = reviewStatus;
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'name email avatar')
      .select('title content type status reviewStatus tags views likes answers createdAt updatedAt author');

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
        drafts: 0,
        pending: 0,
        published: 0,
        rejected: 0,
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

// 审核文章/更新状态
export async function PUT(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { postId, action, reason, status, featured } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: '文章ID不能为空' }, { status: 400 });
    }

    const updateData: { 
      status?: string; 
      reviewStatus?: string;
      featured?: boolean; 
      updatedAt: Date;
      rejectionReason?: string;
    } = {
      updatedAt: new Date()
    };
    
    // 处理审核操作
    if (action === 'approve') {
      updateData.reviewStatus = 'published';
      // 清除拒绝理由
      updateData.rejectionReason = '';
    } else if (action === 'reject') {
      updateData.reviewStatus = 'rejected';
      if (reason) {
        updateData.rejectionReason = reason;
      }
    }
    
    // 处理其他更新
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

    // 检查文章是否存在
    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    // 使用级联删除功能删除文章及其相关的图片和评论
    await deletePostWithCascade(postId);

    return NextResponse.json({ message: '文章删除成功' });
  } catch (error) {
    console.error('删除文章失败:', error);
    return NextResponse.json(
      { error: '删除文章失败' },
      { status: 500 }
    );
  }
} 