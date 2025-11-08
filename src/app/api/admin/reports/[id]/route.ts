import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Report from '@/models/Report';
import User from '@/models/User';
import { uploadToMinio, deleteFromMinio, moveImageToReport } from '@/lib/minio';
import Image from '@/models/Image';
import path from 'path';
import crypto from 'crypto';

// 图片对象类型定义
interface ReportImage {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
}

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

// 获取单个报表详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = await checkAdminPermission(session);
    if (!user) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const report = await Report.findById(id)
      .populate('category', 'name color icon')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    if (!report) {
      return NextResponse.json({ error: '报表不存在' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('获取报表详情失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 更新报表
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = await checkAdminPermission(session);
    if (!user) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const report = await Report.findById(id);
    if (!report) {
      return NextResponse.json({ error: '报表不存在' }, { status: 404 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || '';
    const category = formData.get('category') as string;
    const isActive = formData.get('isActive') === 'true';
    const sortOrder = parseInt(formData.get('sortOrder') as string || '0');
    const existingImages = formData.get('existingImages') as string; // JSON字符串
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

    // 处理现有图片
    const originalImages = report.images || [];
    let images = [];
    if (existingImages) {
      try {
        images = JSON.parse(existingImages);
      } catch (e) {
        return NextResponse.json({ error: '现有图片数据格式错误' }, { status: 400 });
      }
    }

    // 注意：这里不删除图片，只有在保存成功后才删除
    // 找出被删除的图片（在原始列表中但不在新列表中）
    const deletedImages = (originalImages as ReportImage[]).filter((originalImg: ReportImage) => {
      return !images.some((newImg: any) => 
        newImg.url === originalImg.url || 
        newImg.filename === originalImg.filename
      );
    });

    // 上传新图片
    if (files && files.length > 0) {
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
          const tempFileUrl = await uploadToMinio(buffer, fileName, file.type, undefined, user._id.toString(), undefined, false, false, false, undefined, true);

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

          images.push({
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
    }

    // 至少需要一张图片
    if (images.length === 0) {
      return NextResponse.json({ error: '报表至少需要一张图片' }, { status: 400 });
    }

    // 处理新上传的图片：移动到正式位置
    const finalImages = [];
    for (const img of images) {
      // 如果是新上传的图片（有tempObjectName），需要移动
      if (img.tempObjectName) {
        try {
          const newFileUrl = await moveImageToReport(
            img.tempObjectName,
            id,
            img.filename
          );

          // 更新数据库中的图片记录
          const finalObjectName = `reports/${id}/${img.filename}`;
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
      } else {
        // 现有图片，直接使用
        finalImages.push({
          url: img.url,
          filename: img.filename,
          originalName: img.originalName,
          size: img.size,
          mimetype: img.mimetype
        });
      }
    }

    // 删除被移除的图片（从MinIO和数据库）
    for (const deletedImg of deletedImages) {
      try {
        // 从URL中提取objectName
        const urlMatch = deletedImg.url.match(/\/api\/images\/(.+)/);
        if (urlMatch) {
          const objectName = urlMatch[1];
          // 删除MinIO中的文件
          await deleteFromMinio(objectName);
          console.log(`✅ 已删除MinIO文件: ${objectName}`);
        }

        // 查找并删除数据库中的图片记录
        const imageRecord = await Image.findOne({
          $or: [
            { url: deletedImg.url },
            { filename: deletedImg.filename }
          ]
        });
        if (imageRecord) {
          await Image.findByIdAndDelete(imageRecord._id);
          console.log(`✅ 已删除图片记录: ${deletedImg.filename}`);
        }
      } catch (error) {
        console.error(`❌ 删除图片失败: ${deletedImg.filename}`, error);
        // 继续处理其他图片，不中断流程
      }
    }

    // 更新报表
    report.name = name.trim();
    report.description = description.trim();
    report.category = categoryDoc._id;
    report.images = finalImages;
    report.isActive = isActive;
    report.sortOrder = sortOrder;
    report.updatedBy = user._id;

    await report.save();

    const populatedReport = await Report.findById(report._id)
      .populate('category', 'name color icon')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    return NextResponse.json(populatedReport);
  } catch (error) {
    console.error('更新报表失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 删除报表
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = await checkAdminPermission(session);
    if (!user) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const report = await Report.findById(id);
    if (!report) {
      return NextResponse.json({ error: '报表不存在' }, { status: 404 });
    }

    // 删除报表关联的所有图片
    const images = (report.images || []) as ReportImage[];
    for (const img of images) {
      try {
        // 从URL中提取objectName
        const urlMatch = img.url.match(/\/api\/images\/(.+)/);
        if (urlMatch) {
          const objectName = urlMatch[1];
          // 删除MinIO中的文件
          await deleteFromMinio(objectName);
          console.log(`✅ 已删除MinIO文件: ${objectName}`);
        }

        // 查找并删除数据库中的图片记录
        const imageRecord = await Image.findOne({
          $or: [
            { url: img.url },
            { filename: img.filename }
          ]
        });
        if (imageRecord) {
          await Image.findByIdAndDelete(imageRecord._id);
          console.log(`✅ 已删除图片记录: ${img.filename}`);
        }
      } catch (error) {
        console.error(`❌ 删除图片失败: ${img.filename}`, error);
        // 继续处理其他图片，不中断流程
      }
    }

    // 删除报表记录
    await Report.findByIdAndDelete(id);

    return NextResponse.json({ message: '报表删除成功' });
  } catch (error) {
    console.error('删除报表失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

