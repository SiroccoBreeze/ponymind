import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';

// 获取单个文章
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;
    const post = await Post.findById(id).populate('author', 'name email');

    if (!post) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    // 权限控制：未审核通过的文章只能作者和管理员查看
    if (post.reviewStatus !== 'published') {
      const session = await getServerSession();
      
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: '内容审核中，请登录后查看' },
          { status: 403 }
        );
      }

      // 查找用户信息
      const user = await User.findOne({ email: session.user.email });
      
      // 检查是否是作者或管理员
      const isAuthor = post.author.email === session.user.email;
      const isAdmin = user?.role === 'admin';
      
      if (!isAuthor && !isAdmin) {
        return NextResponse.json(
          { error: '无权限查看此内容' },
          { status: 403 }
        );
      }
    }

    // 增加浏览量（只有已发布的内容才增加浏览量）
    if (post.reviewStatus === 'published') {
      await Post.findByIdAndUpdate(id, { $inc: { views: 1 } });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('获取文章失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 更新文章
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const { id } = await params;
    const { title, content, tags, difficulty, bounty, reviewStatus, questionDetails } = await request.json();

    // 验证必填字段
    if (!title?.trim()) {
      return NextResponse.json(
        { error: '标题不能为空' },
        { status: 400 }
      );
    }

    // 查找文章并验证权限
    const post = await Post.findById(id).populate('author', 'email');
    
    if (!post) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    // 检查权限：只有作者可以编辑
    if (post.author.email !== session.user.email) {
      return NextResponse.json(
        { error: '无权限编辑此文章' },
        { status: 403 }
      );
    }

    // 构建更新数据
    const updateData: any = {
      title: title.trim(),
      content: content?.trim() || '',
      summary: content?.trim().substring(0, 200) + '...' || '',
      tags: tags || [],
      updatedAt: new Date(),
    };

    // 如果是问题类型，更新相关字段
    if (post.type === 'question') {
      if (difficulty) updateData.difficulty = difficulty;
      if (bounty !== undefined) updateData.bounty = Math.max(0, bounty);
      if (questionDetails) updateData.questionDetails = questionDetails;
    }

    // 处理审核状态
    if (reviewStatus) {
      updateData.reviewStatus = reviewStatus;
    }

    // 更新文章
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('author', 'name email');

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error('更新文章失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
} 