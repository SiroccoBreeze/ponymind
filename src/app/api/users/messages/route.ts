import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import Comment from '@/models/Comment';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    await connectDB();

    // 查找用户的帖子
    const userPosts = await Post.find({
      'author.email': session.user.email
    }).select('_id title reviewStatus rejectionReason createdAt updatedAt');

    // 生成消息列表
    const messages = [];

    // 审核相关消息
    for (const post of userPosts) {
      if (post.reviewStatus === 'rejected' && post.rejectionReason) {
        messages.push({
          id: `rejection_${post._id}`,
          type: 'rejection',
          title: '内容审核未通过',
          content: `您的${post.type === 'article' ? '文章' : '问题'}"${post.title}"未通过审核。原因：${post.rejectionReason}`,
          relatedId: post._id,
          relatedType: 'post',
          isRead: false,
          createdAt: post.updatedAt,
          priority: 'high'
        });
      } else if (post.reviewStatus === 'published') {
        // 发布成功消息（只显示最近的）
        const publishTime = new Date(post.updatedAt);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - publishTime.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 7) { // 只显示7天内的发布消息
          messages.push({
            id: `published_${post._id}`,
            type: 'success',
            title: '内容发布成功',
            content: `您的${post.type === 'article' ? '文章' : '问题'}"${post.title}"已成功发布！`,
            relatedId: post._id,
            relatedType: 'post',
            isRead: true,
            createdAt: post.updatedAt,
            priority: 'normal'
          });
        }
      }
    }

    // 系统消息
    const systemMessages = [
      {
        id: 'welcome',
        type: 'info',
        title: '欢迎加入PonyMind社区',
        content: '感谢您注册PonyMind！开始分享您的知识和经验吧。记得完善您的个人资料哦。',
        relatedId: null,
        relatedType: null,
        isRead: false,
        createdAt: new Date().toISOString(),
        priority: 'normal'
      },
      {
        id: 'feature_update',
        type: 'info',
        title: '功能更新通知',
        content: '我们更新了编辑器体验，现在编写内容更加流畅。同时优化了搜索功能，快来体验吧！',
        relatedId: null,
        relatedType: null,
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2天前
        priority: 'low'
      }
    ];

    // 合并所有消息并按时间排序
    const allMessages = [...messages, ...systemMessages].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 分页参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const paginatedMessages = allMessages.slice(offset, offset + limit);
    const total = allMessages.length;
    const totalPages = Math.ceil(total / limit);

    // 统计未读消息数
    const unreadCount = allMessages.filter(msg => !msg.isRead).length;

    return NextResponse.json({
      messages: paginatedMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      unreadCount
    });

  } catch (error) {
    console.error('获取消息失败:', error);
    return NextResponse.json(
      { error: '获取消息失败' },
      { status: 500 }
    );
  }
}

// 标记消息为已读
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { messageIds } = await request.json();

    // 这里实际项目中应该更新数据库中的消息状态
    // 暂时返回成功响应
    return NextResponse.json({ 
      success: true,
      message: '消息已标记为已读'
    });

  } catch (error) {
    console.error('标记消息失败:', error);
    return NextResponse.json(
      { error: '标记消息失败' },
      { status: 500 }
    );
  }
} 