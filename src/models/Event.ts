import mongoose from 'mongoose';
import { getCurrentUTCTime } from '@/lib/time-utils';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  tags: [{
    type: String,
    default: [],
    index: true,
  }],
  status: {
    type: String,
    enum: ['planned', 'in-progress', 'done', 'canceled'],
    default: 'planned',
    index: true,
  },
  occurredAt: {
    type: Date,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: getCurrentUTCTime,
  },
  updatedAt: {
    type: Date,
    default: getCurrentUTCTime,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  userGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserGroup',
    required: true,
    index: true,
  },
  attachments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image',
      default: [],
    },
  ],
});

eventSchema.pre('save', function(next) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (this as any).updatedAt = getCurrentUTCTime();
  next();
});

export type EventDocument = mongoose.InferSchemaType<typeof eventSchema> & mongoose.Document;
// 兼容开发热更新：若已存在模型缺少新字段（如 creator/attachments），删除旧模型后重建
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const existingEventModel: any = (mongoose.models as any).Event;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const existingSchema: any | undefined = existingEventModel?.schema;
const hasCreatorPath = !!existingSchema?.path?.('creator');
const hasAttachmentsPath = !!existingSchema?.path?.('attachments');
if (existingEventModel && (!hasCreatorPath || !hasAttachmentsPath)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (mongoose.models as any).Event;
}
export default mongoose.models.Event || mongoose.model('Event', eventSchema);

