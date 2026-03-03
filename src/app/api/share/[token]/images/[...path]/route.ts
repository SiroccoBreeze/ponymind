import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ShareLink from '@/models/ShareLink';
import Image from '@/models/Image';
import { getObject } from '@/lib/minio';

/**
 * GET /api/share/[token]/images/[...path]
 * 公开接口 — 无需登录，通过有效分享 token 访问文章/评论中的图片。
 * 校验 token 有效且 path 属于该分享文章。
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; path: string[] }> }
) {
  try {
    const { token, path: pathSegments } = await params;
    const objectName = pathSegments.join('/');

    await dbConnect();

    const shareLink = await ShareLink.findOne({ token });
    if (!shareLink) {
      return NextResponse.json({ error: '分享链接不存在' }, { status: 404 });
    }
    if (shareLink.isRevoked) {
      return NextResponse.json({ error: '分享链接已撤销' }, { status: 410 });
    }
    if (shareLink.expiresAt < new Date()) {
      return NextResponse.json({ error: '分享链接已过期' }, { status: 410 });
    }

    const postId = shareLink.postId.toString();
    const parts = pathSegments;

    // 允许头像: images/userId/avatar/filename（分享页需展示作者、评论者头像）
    const isAvatar = parts.length >= 3 && parts[0] === 'images' && parts[2] === 'avatar';

    // 允许文章/评论图片: images/userId/post/postId/... 或 images/userId/post/postId/comments/...
    const isPostImage =
      parts.length >= 4 &&
      parts[0] === 'images' &&
      parts[2] === 'post' &&
      parts[3] === postId;

    if (!isAvatar && !isPostImage) {
      return NextResponse.json({ error: '图片路径无效' }, { status: 403 });
    }

    let mimetype = 'image/jpeg';
    const imageRecord = await Image.findOne({ objectName });
    if (imageRecord?.mimetype) {
      mimetype = imageRecord.mimetype;
    } else {
      const ext = objectName.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
      };
      if (ext && mimeMap[ext]) mimetype = mimeMap[ext];
    }

    const imageBuffer = await getObject(objectName);

    const headers = new Headers();
    headers.set('Content-Type', mimetype);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(imageBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('分享图片访问失败:', error);
    return NextResponse.json({ error: '图片获取失败' }, { status: 500 });
  }
}
