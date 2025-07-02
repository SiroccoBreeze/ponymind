import mongoose from 'mongoose';

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
    required: true,
  },
  url: {
    type: String,
    required: true,
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
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 创建索引
imageSchema.index({ uploader: 1 });
imageSchema.index({ associatedPost: 1 });
imageSchema.index({ createdAt: -1 });

// 更新updatedAt时间戳
imageSchema.pre('save', function(next: () => void) {
  this.updatedAt = new Date();
  next();
});

const Image = mongoose.models.Image || mongoose.model('Image', imageSchema);

export default Image; 