const { Client } = require('minio');
require('dotenv').config({ path: '.env.local' });

// MinIO客户端配置
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const DEFAULT_BUCKET = process.env.MINIO_BUCKET || 'ponymind-images';

async function initMinio() {
  try {
    console.log('🚀 初始化MinIO存储...');
    
    // 检查存储桶是否存在
    const exists = await minioClient.bucketExists(DEFAULT_BUCKET);
    
    if (!exists) {
      console.log(`📦 创建存储桶: ${DEFAULT_BUCKET}`);
      await minioClient.makeBucket(DEFAULT_BUCKET, 'us-east-1');
      
      // 设置存储桶策略为公开读取
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${DEFAULT_BUCKET}/*`],
          },
        ],
      };
      
      await minioClient.setBucketPolicy(DEFAULT_BUCKET, JSON.stringify(policy));
      console.log(`✅ 设置存储桶 ${DEFAULT_BUCKET} 为公开读取`);
    } else {
      console.log(`✅ 存储桶 ${DEFAULT_BUCKET} 已存在`);
    }
    
    console.log('🎉 MinIO初始化完成！');
    console.log(`📁 存储桶: ${DEFAULT_BUCKET}`);
    console.log(`🌐 访问地址: ${process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`}`);
    
  } catch (error) {
    console.error('❌ MinIO初始化失败:', error);
    process.exit(1);
  }
}

// 运行初始化
initMinio(); 