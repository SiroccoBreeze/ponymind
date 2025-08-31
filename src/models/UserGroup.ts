import mongoose, { Document, Schema } from 'mongoose';

export interface IUserGroup extends Document {
  name: string;
  description: string;
  permissions: string[];
  members: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserGroupSchema = new Schema<IUserGroup>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    required: false,
    trim: true,
    maxlength: 200
  },
  permissions: [{
    type: String,
    enum: [
      'read_posts',
      'write_posts',
      'delete_posts',
      'moderate_comments',
      'manage_users',
      'manage_tags',
      'view_analytics',
      'admin_access'
    ],
    default: []
  }],
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#3b82f6'
  },
  icon: {
    type: String,
    default: 'users'
  }
}, {
  timestamps: true
});

// 虚拟字段：成员数量
UserGroupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// 确保虚拟字段在 JSON 序列化时包含
UserGroupSchema.set('toJSON', { virtuals: true });
UserGroupSchema.set('toObject', { virtuals: true });

const UserGroup = mongoose.models.UserGroup || mongoose.model<IUserGroup>('UserGroup', UserGroupSchema);

export default UserGroup;
