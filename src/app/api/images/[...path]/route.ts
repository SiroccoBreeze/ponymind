import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import connectDB from '@/lib/mongodb';
import Image from '@/models/Image';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 多层防护机制
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = xForwardedFor?.split(',')[0] || realIp || 'unknown';
    
    // 1. 检查 User-Agent 是否为空或可疑
    if (!userAgent || userAgent.length < 10) {
      return NextResponse.json(
        { error: '无效的请求' },
        { status: 403 }
      );
    }
    
    // 2. 检查是否为常见的爬虫或机器人
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i, 
      /wget/i, /curl/i, /python/i, /java/i,
      /scanner/i, /probe/i, /monitor/i, /headless/i,
      /phantom/i, /selenium/i, /webdriver/i
    ];
    
    const isBot = botPatterns.some(pattern => pattern.test(userAgent));
    
    // 3. 检查 Referer 是否来自本站
    const isFromOurSite = referer && referer.includes(request.nextUrl.origin);
    
    // 4. 如果是机器人且不是从本站访问，拒绝
    if (isBot && !isFromOurSite) {
      console.log(`🚫 拒绝机器人访问图片: ${userAgent} from ${clientIp}`);
      return NextResponse.json(
        { error: '访问被拒绝' },
        { status: 403 }
      );
    }
    
    // 5. 对于外部直接访问（无 referer 或非本站 referer），要求登录
    if (!isFromOurSite) {
      const session = await getServerSession();
      if (!session?.user?.email) {
        console.log(`🚫 未登录用户尝试直接访问图片: ${clientIp}`);
        return NextResponse.json(
          { error: '需要登录才能访问图片' },
          { status: 401 }
        );
      }
    }

    await connectDB();

    // 解析文件路径
    const [dateStr, fileName] = params.path;
    if (!dateStr || !fileName) {
      return NextResponse.json(
        { error: '无效的文件路径' },
        { status: 400 }
      );
    }

    // 查找图片记录 - 不限制用户，允许访问所有图片
    const imageRecord = await Image.findOne({ 
      filename: fileName
    });

    if (!imageRecord) {
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
      );
    }

    // 检查文件是否存在
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'images', dateStr, fileName);
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    // 读取文件
    const fileBuffer = await readFile(filePath);

    // 设置响应头和安全策略
    const response = new NextResponse(fileBuffer);
    response.headers.set('Content-Type', imageRecord.mimetype);
    response.headers.set('Content-Length', fileBuffer.length.toString());
    
    // 缓存策略：来自本站的请求缓存较长时间，外部访问缓存较短时间
    const cacheMaxAge = isFromOurSite ? 86400 : 3600; // 本站24小时，外部1小时
    response.headers.set('Cache-Control', `private, max-age=${cacheMaxAge}`);
    
    // 安全头
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('Referrer-Policy', 'same-origin');
    
    // 防止直接链接
    if (!isFromOurSite) {
      response.headers.set('Content-Disposition', 'inline');
    }

    console.log(`✅ 图片访问成功: ${fileName} from ${clientIp} (${isFromOurSite ? '本站' : '外部'})`);
    return response;

  } catch (error) {
    console.error('获取图片失败:', error);
    return NextResponse.json(
      { error: '获取图片失败' },
      { status: 500 }
    );
  }
} 