import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import { deletePostWithCascade } from '@/lib/cascade-delete';
import { createMessage } from '@/lib/message-utils';

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
  reviewStatus?: string | { $ne: string };
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
        query.reviewStatus = { $ne: 'draft' } as { $ne: string };
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

    // 如果是拒绝操作，发送消息给作者
    if (action === 'reject' && updatedPost.author) {
      let messageSent = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!messageSent && retryCount < maxRetries) {
        try {
          const messageTitle = `您的内容"${updatedPost.title}"未通过审核`;
          const messageContent = reason 
            ? `您发布的内容"${updatedPost.title}"未通过审核。

拒绝原因：${reason}

内容类型：${updatedPost.type === 'article' ? '文章' : '问题'}
提交时间：${new Date(updatedPost.createdAt).toLocaleDateString('zh-CN')}

请根据反馈意见修改后重新提交。如有疑问，请联系管理员。`
            : `您发布的内容"${updatedPost.title}"未通过审核。

内容类型：${updatedPost.type === 'article' ? '文章' : '问题'}
提交时间：${new Date(updatedPost.createdAt).toLocaleDateString('zh-CN')}

请检查内容是否符合社区规范后重新提交。如有疑问，请联系管理员。`;

          await createMessage(
            updatedPost.author._id.toString(),
            'rejection',
            messageTitle,
            messageContent,
            {
              relatedId: postId,
              relatedType: 'post',
              priority: 'high'
            }
          );
          console.log(`已发送拒绝消息给用户 ${updatedPost.author.email}，内容ID: ${postId}`);
          messageSent = true;
        } catch (messageError) {
          retryCount++;
          console.error(`发送拒绝消息失败 (尝试 ${retryCount}/${maxRetries}):`, messageError);
          
          if (retryCount >= maxRetries) {
            console.error('发送拒绝消息最终失败，已达到最大重试次数');
            // 消息发送失败不影响主要操作，只记录日志
          } else {
            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
    }

    // 如果是通过审核操作，发送消息给作者
    if (action === 'approve' && updatedPost.author) {
      let messageSent = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!messageSent && retryCount < maxRetries) {
        try {
          const messageTitle = `您的内容"${updatedPost.title}"已通过审核`;
          const messageContent = `恭喜！您发布的内容"${updatedPost.title}"已通过审核并发布。

内容类型：${updatedPost.type === 'article' ? '文章' : '问题'}
审核时间：${new Date().toLocaleDateString('zh-CN')}

您的内容现在可以被其他用户查看和互动了。感谢您为社区贡献优质内容！`;

          await createMessage(
            updatedPost.author._id.toString(),
            'success',
            messageTitle,
            messageContent,
            {
              relatedId: postId,
              relatedType: 'post',
              priority: 'normal'
            }
          );
          console.log(`已发送通过审核消息给用户 ${updatedPost.author.email}，内容ID: ${postId}`);
          messageSent = true;
        } catch (messageError) {
          retryCount++;
          console.error(`发送通过审核消息失败 (尝试 ${retryCount}/${maxRetries}):`, messageError);
          
          if (retryCount >= maxRetries) {
            console.error('发送通过审核消息最终失败，已达到最大重试次数');
            // 消息发送失败不影响主要操作，只记录日志
          } else {
            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
    }

    return NextResponse.json({
      ...updatedPost.toObject(),
      messageSent: action === 'reject' || action === 'approve',
      messageType: action === 'reject' ? 'rejection' : action === 'approve' ? 'success' : null
    });
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

    // 在删除前发送消息给作者
    if (post.author) {
      let messageSent = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!messageSent && retryCount < maxRetries) {
        try {
          const messageTitle = `您的内容"${post.title}"已被删除`;
          const messageContent = `很抱歉，您发布的内容"${post.title}"已被管理员删除。

内容类型：${post.type === 'article' ? '文章' : '问题'}
删除时间：${new Date().toLocaleDateString('zh-CN')}

如果对此有疑问，请联系管理员。`;

          await createMessage(
            post.author._id.toString(),
            'warning',
            messageTitle,
            messageContent,
            {
              relatedId: postId,
              relatedType: 'post',
              priority: 'high'
            }
          );
          console.log(`已发送删除消息给用户 ${post.author.email}，内容ID: ${postId}`);
          messageSent = true;
        } catch (messageError) {
          retryCount++;
          console.error(`发送删除消息失败 (尝试 ${retryCount}/${maxRetries}):`, messageError);
          
          if (retryCount >= maxRetries) {
            console.error('发送删除消息最终失败，已达到最大重试次数');
            // 消息发送失败不影响主要操作，只记录日志
          } else {
            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
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

// 测试消息发送功能
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { action, postId, recipientId, messageType } = await request.json();

    if (action === 'test-message' && recipientId) {
      try {
        const testMessage = await createMessage(
          recipientId,
          messageType || 'info',
          '测试消息',
          '这是一条测试消息，用于验证消息发送功能是否正常工作。',
          {
            relatedId: postId || null,
            relatedType: 'post',
            priority: 'normal'
          }
        );

        return NextResponse.json({
          success: true,
          message: '测试消息发送成功',
          messageId: testMessage._id
        });
      } catch (messageError) {
        console.error('测试消息发送失败:', messageError);
        return NextResponse.json(
          { error: '测试消息发送失败', details: messageError },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 });
  } catch (error) {
    console.error('测试消息发送失败:', error);
    return NextResponse.json(
      { error: '测试消息发送失败' },
      { status: 500 }
    );
  }
} 