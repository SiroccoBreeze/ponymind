import mongoose from 'mongoose';

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    default: '',
    maxlength: 200
  },
  color: {
    type: String,
    default: '#3b82f6',
    match: /^#[0-9A-F]{6}$/i
  },
  postCount: {
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
  }
}, {
  timestamps: true
});

// 索引
TagSchema.index({ name: 1 }, { unique: true });
TagSchema.index({ postCount: -1 });
TagSchema.index({ createdAt: -1 });

const Tag = mongoose.models.Tag || mongoose.model('Tag', TagSchema);

export default Tag; 