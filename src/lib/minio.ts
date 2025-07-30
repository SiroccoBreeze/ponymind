import { Client } from 'minio';

// MinIO客户端配置
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

// 默认存储桶名称
const DEFAULT_BUCKET = process.env.MINIO_BUCKET || 'ponymind-images';

// 确保存储桶存在
export async function ensureBucketExists(bucketName: string = DEFAULT_BUCKET) {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`✅ 创建MinIO存储桶: ${bucketName}`);
      
      // 保持存储桶为private，不设置公开读取策略
      // 所有访问将通过API进行身份验证
      console.log(`✅ 存储桶 ${bucketName} 保持私有访问`);
    }
  } catch (error) {
    console.error('❌ MinIO存储桶操作失败:', error);
    throw error;
  }
}

// 上传文件到MinIO
export async function uploadToMinio(
  file: Buffer,
  fileName: string,
  contentType: string,
  bucketName: string = DEFAULT_BUCKET,
  userId?: string,
  postId?: string,
  isAvatar: boolean = false
): Promise<string> {
  try {
    await ensureBucketExists(bucketName);
    
    // 根据文件类型和参数决定路径结构
    let objectName: string;
    if (isAvatar && userId) {
      // 头像文件: images/userId/avatar/filename
      objectName = `images/${userId}/avatar/${fileName}`;
    } else if (userId && postId) {
      // 用户ID/帖子ID/图片名称
      objectName = `images/${userId}/${postId}/${fileName}`;
    } else if (userId) {
      // 用户ID/临时文件夹/图片名称（用于上传时还没有帖子ID的情况）
      objectName = `images/${userId}/temp/${fileName}`;
    } else {
      // 保持原有的日期结构作为后备
      objectName = `images/${new Date().toISOString().split('T')[0]}/${fileName}`;
    }
    
    await minioClient.putObject(bucketName, objectName, file, file.length, {
      'Content-Type': contentType,
    });
    
    // 返回相对路径而不是完整URL，这样在迁移服务器时不会受影响
    return `/api/images/${objectName}`;
  } catch (error) {
    console.error('❌ 上传文件到MinIO失败:', error);
    throw error;
  }
}

// 移动临时图片到正式位置
export async function moveImageToPost(
  oldObjectName: string,
  userId: string,
  postId: string,
  fileName: string,
  bucketName: string = DEFAULT_BUCKET
): Promise<string> {
  try {
    const newObjectName = `images/${userId}/${postId}/${fileName}`;
    
    // 复制文件到新位置
    await minioClient.copyObject(
      bucketName,
      newObjectName,
      `/${bucketName}/${oldObjectName}`
    );
    
    // 删除旧文件
    await minioClient.removeObject(bucketName, oldObjectName);
    
    // 返回相对路径
    return `/api/images/${newObjectName}`;
  } catch (error) {
    console.error('❌ 移动文件失败:', error);
    throw error;
  }
}

// 从MinIO删除文件
export async function deleteFromMinio(
  objectName: string,
  bucketName: string = DEFAULT_BUCKET
): Promise<void> {
  try {
    await minioClient.removeObject(bucketName, objectName);
  } catch (error) {
    console.error('❌ 从MinIO删除文件失败:', error);
    throw error;
  }
}

// 从MinIO获取文件
export async function getObject(
  objectName: string,
  bucketName: string = DEFAULT_BUCKET
): Promise<Buffer> {
  try {
    const stream = await minioClient.getObject(bucketName, objectName);
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      stream.on('error', reject);
    });
  } catch (error) {
    console.error('❌ 从MinIO获取文件失败:', error);
    throw error;
  }
}

// 从URL中提取对象名称
export function extractObjectNameFromUrl(url: string, bucketName: string = DEFAULT_BUCKET): string {
  try {
    // 处理相对路径格式: /api/images/images/userId/postId/filename
    const apiPrefix = '/api/images/';
    if (url.startsWith(apiPrefix)) {
      return url.substring(apiPrefix.length);
    }
    
    // 处理完整URL格式: http://localhost:3000/api/images/images/userId/postId/filename
    if (url.includes(apiPrefix)) {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const apiIndex = pathname.indexOf(apiPrefix);
      if (apiIndex !== -1) {
        return pathname.substring(apiIndex + apiPrefix.length);
      }
    }
    
    // 处理直接MinIO URL格式（向后兼容）
  const baseUrl = process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`;
  const prefix = `${baseUrl}/${bucketName}/`;
  
  if (url.startsWith(prefix)) {
    return url.substring(prefix.length);
  }
  
  // 如果URL格式不匹配，尝试从路径中提取
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const bucketIndex = pathParts.indexOf(bucketName);
  
  if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
    return pathParts.slice(bucketIndex + 1).join('/');
  }
  
  throw new Error('无法从URL中提取对象名称');
  } catch (error) {
    console.error('提取对象名称失败:', error);
    throw new Error('无法从URL中提取对象名称');
  }
}

export default minioClient; 