import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import path from 'path';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Image from '@/models/Image';
import { uploadToMinio } from '@/lib/minio';

// 允许的通用附件类型（包含常见文档与压缩包、图片等）
const ALLOWED_TYPES = [
  // 文档
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  // 压缩包
  'application/zip',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/x-tar',
  // 图片（兼容图片作为附件）
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES_PER_REQUEST = 20;

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录状态
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    await connectDB();

    // 查找用户信息以获取用户ID
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 解析表单数据
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const eventId = formData.get('eventId') as string; // 获取事件ID（可选）

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '请选择要上传的附件' },
        { status: 400 }
      );
    }

    // 检查文件数量限制
    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `一次最多只能上传${MAX_FILES_PER_REQUEST}个附件` },
        { status: 400 }
      );
    }

    const uploadedAttachments = [];
    const errors = [];

    for (const file of files) {
      try {
        // 验证文件类型
        if (!ALLOWED_TYPES.includes(file.type)) {
          errors.push(`文件 ${file.name} 格式不支持，仅支持 PDF、Word、Excel、PowerPoint、TXT、ZIP、RAR、7Z、TAR 和常见图片格式`);
          continue;
        }

        // 验证文件大小
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`文件 ${file.name} 大小超过 20MB 限制`);
          continue;
        }

        // 生成唯一文件名
        const fileExt = path.extname(file.name) || '';
        const fileName = `${crypto.randomUUID()}${fileExt}`;

        // 保存文件到MinIO
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        let fileUrl: string;
        let objectName: string;
        
        if (eventId) {
          // 如果提供了事件ID，直接上传到事件目录
          fileUrl = await uploadToMinio(
            buffer, 
            fileName, 
            file.type, 
            undefined, 
            user._id.toString(),
            undefined,
            false,
            false,
            true, // isEvent
            eventId
          );
          objectName = `images/${user._id}/event/${eventId}/${fileName}`;
        } else {
          // 否则上传到临时目录
          fileUrl = await uploadToMinio(buffer, fileName, file.type, undefined, user._id.toString());
          objectName = `images/${user._id}/temp/${fileName}`;
        }

        // 保存到数据库
        const attachmentRecord = new Image({
          filename: fileName,
          originalName: file.name,
          mimetype: file.type,
          size: file.size,
          url: fileUrl,
          objectName: objectName,
          storageType: 'minio',
          uploader: user._id,
          associatedPost: null,
          isUsed: false, // 标记为未确认使用
        });

        await attachmentRecord.save();

        uploadedAttachments.push({
          id: attachmentRecord._id.toString(),
          filename: fileName,
          originalName: file.name,
          url: fileUrl,
          size: file.size,
          mimetype: file.type,
          isConfirmed: false, // 前端需要确认使用
        });

      } catch (error) {
        console.error(`上传文件 ${file.name} 失败:`, error);
        errors.push(`文件 ${file.name} 上传失败`);
      }
    }

    if (uploadedAttachments.length === 0) {
      return NextResponse.json(
        { error: '没有附件上传成功', details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `成功上传 ${uploadedAttachments.length} 个附件`,
      attachments: uploadedAttachments,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('附件上传失败:', error);
    return NextResponse.json(
      { error: '附件上传失败' },
      { status: 500 }
    );
  }
}

