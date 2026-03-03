import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ShareLink from '@/models/ShareLink';
import User from '@/models/User';

// ── DELETE /api/admin/share-links/[token] ── 撤销（软删除）分享链接
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
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

    const { token } = await params;
    const updated = await ShareLink.findOneAndUpdate(
      { token },
      { isRevoked: true },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: '分享链接不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, shareLink: updated });
  } catch (error) {
    console.error('撤销分享链接失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
