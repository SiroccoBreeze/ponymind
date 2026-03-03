import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ShareLink from '@/models/ShareLink';
import Post from '@/models/Post';

/**
 * GET /api/share/[token]
 * 公开接口 — 无需登录验证，通过临时 token 访问文章内容。
 * - 校验 token 存在、未撤销、未过期
 * - 每次访问增加 accessCount
 * - 返回精简的文章数据（内容 + 作者基础信息）
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await dbConnect();
    const { token } = await params;

    const shareLink = await ShareLink.findOne({ token });

    if (!shareLink) {
      return NextResponse.json({ error: '分享链接不存在' }, { status: 404 });
    }
    if (shareLink.isRevoked) {
      return NextResponse.json({ error: '该分享链接已被撤销' }, { status: 410 });
    }
    if (shareLink.expiresAt < new Date()) {
      return NextResponse.json({ error: '该分享链接已过期' }, { status: 410 });
    }

    // 累计访问次数（不等待，不阻塞响应）
    ShareLink.findByIdAndUpdate(shareLink._id, {
      $inc: { accessCount: 1 },
    }).exec().catch(() => {});

    const post = await Post.findById(shareLink.postId).populate(
      'author',
      'name email avatar'
    );

    if (!post) {
      return NextResponse.json({ error: '文章已不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      post: {
        _id: post._id,
        title: post.title,
        content: post.content,
        summary: post.summary,
        type: post.type,
        tags: post.tags,
        views: post.views,
        likes: post.likes,
        answers: post.answers,
        status: post.status,
        difficulty: post.difficulty,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: post.author,
      },
      shareLink: {
        expiresAt: shareLink.expiresAt,
        ttlDays: shareLink.ttlDays,
        accessCount: shareLink.accessCount + 1,
      },
    });
  } catch (error) {
    console.error('访问分享链接失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
