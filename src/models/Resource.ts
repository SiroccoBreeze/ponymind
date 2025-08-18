import mongoose from 'mongoose';

const ResourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResourceCategory',
    required: true
  },
  accessCode: {
    type: String,
    trim: true,
    maxlength: 20
  },
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
  }
}, {
  timestamps: true
});

// 索引
ResourceSchema.index({ category: 1 });
ResourceSchema.index({ isActive: 1, sortOrder: 1 });
ResourceSchema.index({ createdAt: -1 });

const Resource = mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);

export default Resource;
