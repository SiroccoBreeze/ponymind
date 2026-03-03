import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ShareLink from '@/models/ShareLink';
import Post from '@/models/Post';
import User from '@/models/User';
import crypto from 'crypto';

/** 生成 32 字符 URL-safe token */
function generateToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

// ── POST /api/admin/share-links ── 创建分享链接
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足，仅管理员可操作' }, { status: 403 });
    }

    const { postId, ttlDays } = await request.json();
    if (!postId) {
      return NextResponse.json({ error: '缺少 postId' }, { status: 400 });
    }
    if (![1, 3, 7].includes(ttlDays)) {
      return NextResponse.json({ error: 'ttlDays 必须为 1、3 或 7' }, { status: 400 });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const token = generateToken();

    const shareLink = await ShareLink.create({
      token,
      postId,
      ttlDays,
      expiresAt,
      createdBy: user._id,
    });

    return NextResponse.json({ success: true, shareLink }, { status: 201 });
  } catch (error) {
    console.error('创建分享链接失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// ── GET /api/admin/share-links ── 查询分享链接
// ?postId=xxx → 某篇文章的链接列表
// 无 postId → 全部链接，分页 ?page=1&limit=20&search=关键词
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search')?.trim();

    if (postId) {
      const links = await ShareLink.find({ postId })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email');
      return NextResponse.json({ success: true, links });
    }

    // 全部链接，分页
    const query: Record<string, unknown> = {};
    if (search) {
      const postIds = await Post.find(
        { $or: [{ title: new RegExp(search, 'i') }, { content: new RegExp(search, 'i') }] },
        { _id: 1 }
      ).then((docs) => docs.map((d) => d._id));
      if (postIds.length === 0) {
        return NextResponse.json({
          success: true,
          links: [],
          pagination: { page: 1, limit, total: 0, pages: 0 },
        });
      }
      query.postId = { $in: postIds };
    }

    const total = await ShareLink.countDocuments(query);
    const links = await ShareLink.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate({
        path: 'postId',
        select: 'title type',
      });

    return NextResponse.json({
      success: true,
      links,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('查询分享链接失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
