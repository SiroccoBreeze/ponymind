import mongoose from 'mongoose';
import { getCurrentUTCTime } from '@/lib/time-utils';

const reportCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
    unique: true
  },
  description: {
    type: String,
    default: '',
    maxlength: 200
  },
  color: {
    type: String,
    default: '#3b82f6',
    maxlength: 20
  },
  icon: {
    type: String,
    default: 'BarChart3',
    maxlength: 50
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
reportCategorySchema.pre('save', function(next) {
  this.updatedAt = getCurrentUTCTime();
  next();
});

// 索引
reportCategorySchema.index({ sortOrder: 1, name: 1 });
reportCategorySchema.index({ isActive: 1 });

export default mongoose.models.ReportCategory || mongoose.model('ReportCategory', reportCategorySchema);

