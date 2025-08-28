import mongoose from 'mongoose';
import { getCurrentUTCTime } from '@/lib/time-utils';

const messageSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // 系统消息时为null
  },
  type: {
    type: String,
    enum: ['info', 'success', 'rejection', 'warning', 'comment_reply', 'post_like', 'comment_like'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  relatedType: {
    type: String,
    enum: ['post', 'comment', 'user'],
    default: null,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal',
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

// 更新updatedAt时间戳
messageSchema.pre('save', function(next) {
  this.updatedAt = getCurrentUTCTime();
  next();
});

// 按接收者和时间索引
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, isRead: 1 });

export default mongoose.models.Message || mongoose.model('Message', messageSchema); 