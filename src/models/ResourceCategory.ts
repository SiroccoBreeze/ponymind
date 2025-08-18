import mongoose from 'mongoose';

const ResourceCategorySchema = new mongoose.Schema({
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
    default: 'bg-gray-100 text-gray-800',
    maxlength: 100
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
  }
}, {
  timestamps: true
});

// 索引
ResourceCategorySchema.index({ sortOrder: 1, name: 1 });
ResourceCategorySchema.index({ isActive: 1 });

const ResourceCategory = mongoose.models.ResourceCategory || mongoose.model('ResourceCategory', ResourceCategorySchema);

export default ResourceCategory;
