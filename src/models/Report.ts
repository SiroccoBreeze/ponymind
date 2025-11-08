import mongoose from 'mongoose';
import { getCurrentUTCTime } from '@/lib/time-utils';

const reportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    default: '',
    maxlength: 1000
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReportCategory',
    required: true
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
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
reportSchema.pre('save', function(next) {
  this.updatedAt = getCurrentUTCTime();
  next();
});

// 索引
reportSchema.index({ category: 1, isActive: 1, sortOrder: 1 });
reportSchema.index({ createdAt: -1 });

export default mongoose.models.Report || mongoose.model('Report', reportSchema);

