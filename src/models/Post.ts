import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['article', 'question'],
    default: 'article',
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tags: [{
    type: String,
  }],
  views: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  answers: {
    type: Number,
    default: 0,
  },
  acceptedAnswer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: null,
  },
  status: {
    type: String,
    enum: ['open', 'answered', 'closed'],
    default: 'open',
  },
  reviewStatus: {
    type: String,
    enum: ['draft', 'pending', 'published', 'rejected'],
    default: 'published',
  },
  rejectionReason: {
    type: String,
    default: '',
  },
  bounty: {
    type: Number,
    default: 0,
  },
  questionDetails: {
    system: { type: String, default: '' },
    menu: { type: String, default: '' },
    version: { type: String, default: '' },
    operation: { type: String, default: '' },
    expectation: { type: String, default: '' },
    actual: { type: String, default: '' },
    solution: { type: String, default: '' }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
});

// 更新updatedAt时间戳
postSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Post || mongoose.model('Post', postSchema); 