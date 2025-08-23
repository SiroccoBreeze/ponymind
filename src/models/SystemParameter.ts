import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemParameter extends Document {
  key: string;           // 参数键名（唯一标识）
  name: string;          // 参数显示名称
  description: string;   // 参数描述
  value: any;            // 参数值
  type: 'string' | 'number' | 'boolean' | 'array' | 'select'; // 参数类型
  category: string;      // 参数分类
  options?: string[];    // 选择类型参数的可选值
  min?: number;          // 数值类型参数的最小值
  max?: number;          // 数值类型参数的最大值
  unit?: string;         // 参数单位
  isRequired: boolean;   // 是否必填
  isEditable: boolean;   // 是否可编辑
  defaultValue: any;     // 默认值
  createdAt: Date;       // 创建时间
  updatedAt: Date;       // 更新时间
}

const SystemParameterSchema = new Schema<ISystemParameter>({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['string', 'number', 'boolean', 'array', 'select']
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  options: [{
    type: String,
    trim: true
  }],
  min: {
    type: Number
  },
  max: {
    type: Number
  },
  unit: {
    type: String,
    trim: true
  },
  isRequired: {
    type: Boolean,
    default: false
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  defaultValue: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'system_parameters'
});

// 创建复合索引
SystemParameterSchema.index({ category: 1, key: 1 });

// 添加验证器
SystemParameterSchema.pre('save', function(next) {
  // 验证数值类型的范围
  if (this.type === 'number' && this.min !== undefined && this.max !== undefined) {
    if (this.min >= this.max) {
      return next(new Error('最小值必须小于最大值'));
    }
  }
  
  // 验证选择类型必须有选项
  if (this.type === 'select' && (!this.options || this.options.length === 0)) {
    return next(new Error('选择类型参数必须提供选项'));
  }
  
  next();
});

// 静态方法：批量更新参数
SystemParameterSchema.statics.batchUpdate = async function(updates: Array<{ key: string; value: any }>) {
  const bulkOps = updates.map(update => ({
    updateOne: {
      filter: { key: update.key },
      update: { $set: { value: update.value, updatedAt: new Date() } }
    }
  }));
  
  return this.bulkWrite(bulkOps);
};

// 静态方法：根据分类获取参数
SystemParameterSchema.statics.getByCategory = function(category: string) {
  return this.find({ category }).sort({ key: 1 });
};

// 静态方法：获取所有参数（按分类分组）
SystemParameterSchema.statics.getAllGrouped = async function() {
  const parameters = await this.find().sort({ category: 1, key: 1 });
  
  const grouped: { [key: string]: ISystemParameter[] } = {};
  parameters.forEach((param: ISystemParameter) => {
    if (!grouped[param.category]) {
      grouped[param.category] = [];
    }
    grouped[param.category].push(param);
  });
  
  return grouped;
};

// 静态方法：重置参数到默认值
SystemParameterSchema.statics.resetToDefaults = async function() {
  const parameters = await this.find({ defaultValue: { $exists: true, $ne: null } });
  
  const bulkOps = parameters.map((param: ISystemParameter) => ({
    updateOne: {
      filter: { _id: param._id },
      update: { 
        $set: { 
          value: param.defaultValue, 
          updatedAt: new Date() 
        } 
      }
    }
  }));
  
  return this.bulkWrite(bulkOps);
};

// 实例方法：验证参数值
SystemParameterSchema.methods.validateValue = function(value: any): boolean {
  switch (this.type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      if (typeof value !== 'number') return false;
      if (this.min !== undefined && value < this.min) return false;
      if (this.max !== undefined && value > this.max) return false;
      return true;
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'select':
      return this.options ? this.options.includes(value) : false;
    default:
      return false;
  }
};

export default mongoose.models.SystemParameter || mongoose.model<ISystemParameter>('SystemParameter', SystemParameterSchema);
