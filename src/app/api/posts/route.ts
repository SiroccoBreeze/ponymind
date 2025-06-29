import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';

// 获取文章列表
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // 获取查询参数
    const type = searchParams.get('type'); // 'article' | 'question'
    const status = searchParams.get('status'); // 'open' | 'answered' | 'closed'
    const sort = searchParams.get('sort') || 'newest'; // 'newest' | 'active' | 'votes' | 'views' | 'bounty'
    const trending = searchParams.get('trending') === 'true';
    const answers = searchParams.get('answers');
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');
    const author = searchParams.get('author');

    // 构建查询条件
    let query: any = {
      reviewStatus: 'published' // 默认只显示已发布的内容
    };
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (answers !== null) {
      query.answers = parseInt(answers || '0');
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (tag) {
      query.tags = { $in: [tag] };
    }
    
    if (author) {
      const authorUser = await User.findById(author);
      if (authorUser) {
        query.author = author;
      }
    }

    // 构建排序条件
    let sortCondition: any = {};
    
    switch (sort) {
      case 'newest':
        sortCondition = { createdAt: -1 };
        break;
      case 'active':
        sortCondition = { updatedAt: -1 };
        break;
      case 'votes':
        sortCondition = { likes: -1, createdAt: -1 };
        break;
      case 'views':
        sortCondition = { views: -1, createdAt: -1 };
        break;
      case 'bounty':
        sortCondition = { bounty: -1, createdAt: -1 };
        break;
      default:
        sortCondition = { createdAt: -1 };
    }
    
    // 热门内容的特殊处理
    if (trending) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      query.createdAt = { $gte: oneWeekAgo };
      sortCondition = { views: -1, likes: -1, createdAt: -1 };
    }

    const posts = await Post.find(query)
      .populate('author', 'name email')
      .sort(sortCondition)
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
    console.error('获取文章列表失败:', error);
    return NextResponse.json(
      { error: '获取文章列表失败' },
      { status: 500 }
    );
  }
}

// 创建新文章
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    await connectDB();

    const { 
      title, 
      content, 
      summary, 
      tags, 
      type = 'article',
      difficulty = 'intermediate',
      bounty = 0,
      status = 'pending',
      questionDetails
    } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 创建文章/问题
    const postData: any = {
      title,
      content,
      summary: summary || content.substring(0, 200) + '...',
      tags: tags || [],
      type,
      difficulty: type === 'question' ? difficulty : 'intermediate',
      status: type === 'question' ? 'open' : 'answered',
      reviewStatus: status, // 审核状态：draft, pending, published, rejected
      bounty: type === 'question' ? bounty : 0,
      author: user._id,
    };

    // 如果是问题类型，添加问题详情
    if (type === 'question' && questionDetails) {
      postData.questionDetails = questionDetails;
    }

    const post = new Post(postData);

    await post.save();

    // 返回带有作者信息的文章
    await post.populate('author', 'name email');

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('创建文章失败:', error);
    return NextResponse.json(
      { error: '创建文章失败' },
      { status: 500 }
    );
  }
} 