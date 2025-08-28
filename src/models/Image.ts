import mongoose from 'mongoose';
import { getCurrentUTCTime } from '@/lib/time-utils';

const imageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  path: {
    type: String,
    required: false, // 对于MinIO存储，path字段可选
  },
  url: {
    type: String,
    required: true,
  },
  objectName: {
    type: String,
    required: false, // MinIO对象名称
  },
  storageType: {
    type: String,
    enum: ['local', 'minio'],
    default: 'minio',
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  associatedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: getCurrentUTCTime,
  },
  updatedAt: {
    type: Date,
    default: getCurrentUTCTime,
  },
});

// 创建索引
imageSchema.index({ uploader: 1 });
imageSchema.index({ associatedPost: 1 });
imageSchema.index({ createdAt: -1 });

// 更新updatedAt时间戳
imageSchema.pre('save', function(next: () => void) {
  this.updatedAt = getCurrentUTCTime();
  next();
});

const Image = mongoose.models.Image || mongoose.model('Image', imageSchema);

export default Image; 