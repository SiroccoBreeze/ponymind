import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShareLink extends Document {
  token: string;
  postId: mongoose.Types.ObjectId;
  ttlDays: 1 | 3 | 7;
  expiresAt: Date;
  createdBy: mongoose.Types.ObjectId;
  accessCount: number;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShareLinkSchema = new Schema<IShareLink>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    ttlDays: {
      type: Number,
      enum: [1, 3, 7],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

const ShareLink: Model<IShareLink> =
  mongoose.models.ShareLink ||
  mongoose.model<IShareLink>('ShareLink', ShareLinkSchema);

export default ShareLink;
