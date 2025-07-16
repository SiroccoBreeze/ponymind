import mongoose from 'mongoose';

const scheduledTaskSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  taskType: {
    type: String,
    enum: ['cleanupUnusedImages', 'autoCloseQuestions', 'cleanupLogs', 'backupDatabase'],
    required: true,
  },
  isEnabled: {
    type: Boolean,
    default: true,
  },
  schedule: {
    type: String,
    required: true,
    // cron表达式格式: "0 2 * * *" (每天凌晨2点)
  },
  lastRun: {
    type: Date,
    default: null,
  },
  nextRun: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['idle', 'running', 'completed', 'failed'],
    default: 'idle',
  },
  lastResult: {
    success: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed as any,
      default: null,
    },
    duration: {
      type: Number, // 执行时长（毫秒）
      default: 0,
    },
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 更新updatedAt时间戳
scheduledTaskSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 创建索引
scheduledTaskSchema.index({ taskType: 1 });
scheduledTaskSchema.index({ isEnabled: 1 });
scheduledTaskSchema.index({ nextRun: 1 });
scheduledTaskSchema.index({ status: 1 });

const ScheduledTask = mongoose.models.ScheduledTask || mongoose.model('ScheduledTask', scheduledTaskSchema);

export default ScheduledTask; 