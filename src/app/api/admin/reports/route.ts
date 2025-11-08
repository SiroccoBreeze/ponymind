import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Report from '@/models/Report';
import User from '@/models/User';
import { uploadToMinio, moveImageToReport } from '@/lib/minio';
import Image from '@/models/Image';
import path from 'path';
import crypto from 'crypto';

// 允许的文件类型
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// 检查管理员权限
async function checkAdminPermission(session: any) {
  if (!session?.user?.email) {
    return null;
  }
  const user = await User.findOne({ email: session.user.email });
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return null;
  }
  return user;
}

// 获取管理端报表列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = await checkAdminPermission(session);
    if (!user) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // 构建查询条件
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // 执行查询
    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('category', 'name color icon')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(query)
    ]);

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取报表列表失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 创建报表
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = await checkAdminPermission(session);
    if (!user) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || '';
    const category = formData.get('category') as string;
    const isActive = formData.get('isActive') === 'true';
    const sortOrder = parseInt(formData.get('sortOrder') as string || '0');
    const files = formData.getAll('images') as File[];

    // 验证必填字段
    if (!name || !name.trim()) {
      return NextResponse.json({ error: '报表名称不能为空' }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: '请选择分类' }, { status: 400 });
    }

    // 验证分类是否存在
    const ReportCategory = (await import('@/models/ReportCategory')).default;
    const categoryDoc = await ReportCategory.findById(category);
    if (!categoryDoc) {
      return NextResponse.json({ error: '选择的分类不存在' }, { status: 400 });
    }

    // 上传图片
    const uploadedImages = [];
    for (const file of files) {
      try {
        // 验证文件类型
        if (!ALLOWED_TYPES.includes(file.type)) {
          return NextResponse.json(
            { error: `文件 ${file.name} 格式不支持，仅支持 JPG、PNG、GIF、WebP 格式` },
            { status: 400 }
          );
        }

        // 验证文件大小
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `文件 ${file.name} 大小超过 10MB 限制` },
            { status: 400 }
          );
        }

        // 生成唯一文件名
        const fileExt = path.extname(file.name);
        const fileName = `${crypto.randomUUID()}${fileExt}`;

        // 保存文件到MinIO（临时位置）
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const tempFileUrl = await uploadToMinio(buffer, fileName, file.type, undefined, user._id.toString(), null, false, false, false, undefined, true);

        // 临时对象名称
        const tempObjectName = `images/${user._id}/reports/temp/${fileName}`;

        // 保存到数据库（临时）
        const imageRecord = new Image({
          filename: fileName,
          originalName: file.name,
          mimetype: file.type,
          size: file.size,
          url: tempFileUrl,
          objectName: tempObjectName,
          storageType: 'minio',
          uploader: user._id,
          isUsed: false, // 临时标记
        });

        await imageRecord.save();

        uploadedImages.push({
          url: tempFileUrl,
          filename: fileName,
          originalName: file.name,
          size: file.size,
          mimetype: file.type,
          tempObjectName: tempObjectName, // 保存临时路径，用于后续移动
          imageId: imageRecord._id.toString()
        });
      } catch (error) {
        console.error(`上传文件 ${file.name} 失败:`, error);
        return NextResponse.json(
          { error: `文件 ${file.name} 上传失败` },
          { status: 500 }
        );
      }
    }

    // 创建报表
    const report = new Report({
      name: name.trim(),
      description: description.trim(),
      category: categoryDoc._id,
      images: [], // 先创建空数组，稍后填充
      isActive,
      sortOrder,
      createdBy: user._id
    });

    await report.save();

    // 移动图片到正式位置并更新URL
    const finalImages = [];
    for (const img of uploadedImages) {
      try {
        const newFileUrl = await moveImageToReport(
          img.tempObjectName,
          report._id.toString(),
          img.filename
        );

        // 更新数据库中的图片记录
        const finalObjectName = `reports/${report._id}/${img.filename}`;
        await Image.findByIdAndUpdate(img.imageId, {
          url: newFileUrl,
          objectName: finalObjectName,
          isUsed: true
        });

        finalImages.push({
          url: newFileUrl,
          filename: img.filename,
          originalName: img.originalName,
          size: img.size,
          mimetype: img.mimetype
        });
      } catch (error) {
        console.error(`移动图片失败: ${img.filename}`, error);
        // 如果移动失败，使用临时URL（不应该发生，但作为后备）
        finalImages.push({
          url: img.url,
          filename: img.filename,
          originalName: img.originalName,
          size: img.size,
          mimetype: img.mimetype
        });
      }
    }

    // 更新报表的图片列表
    report.images = finalImages;
    await report.save();

    const populatedReport = await Report.findById(report._id)
      .populate('category', 'name color icon')
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(populatedReport, { status: 201 });
  } catch (error) {
    console.error('创建报表失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

