import mongoose, { Schema, Document } from 'mongoose';
import { getCurrentUTCTime } from '@/lib/time-utils';

export interface ILog extends Document {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  category: 'system' | 'auth' | 'api' | 'database' | 'file' | 'user' | 'admin' | 'post' | 'comment' | 'upload' | 'behavior' | 'resource' | 'event' | 'tag' | 'message' | 'search' | 'settings' | 'scheduled_task' | 'system_parameter' | 'user_status' | 'performance' | 'security';
  userId?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  metadata?: Record<string, any>;
  stack?: string;
  tags?: string[];
}

const LogSchema = new Schema<ILog>({
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'debug'],
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: getCurrentUTCTime
  },
  category: {
    type: String,
    enum: ['system', 'auth', 'api', 'database', 'file', 'user', 'admin', 'post', 'comment', 'upload', 'behavior', 'resource', 'event', 'tag', 'message', 'search', 'settings', 'scheduled_task', 'system_parameter', 'user_status', 'performance', 'security'],
    required: true,
    index: true
  },
  userId: {
    type: String,
    index: true
  },
  userEmail: {
    type: String,
    index: true
  },
  ip: String,
  userAgent: String,
  path: String,
  method: String,
  statusCode: Number,
  duration: Number,
  metadata: Schema.Types.Mixed,
  stack: String,
  tags: [String]
});

// 创建复合索引以提高查询性能
LogSchema.index({ timestamp: -1, level: 1, category: 1 });
LogSchema.index({ category: 1, timestamp: -1 });
LogSchema.index({ userId: 1, timestamp: -1 });

// 自动删除30天前的日志
LogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.models.Log || mongoose.model<ILog>('Log', LogSchema);
