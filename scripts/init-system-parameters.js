const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// 系统参数模型
const SystemParameterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  type: { type: String, required: true, enum: ['string', 'number', 'boolean', 'array', 'select'] },
  category: { type: String, required: true, trim: true, index: true },
  options: [{ type: String, trim: true }],
  min: { type: Number },
  max: { type: Number },
  unit: { type: String, trim: true },
  isRequired: { type: Boolean, default: false },
  isEditable: { type: Boolean, default: true },
  defaultValue: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'system_parameters'
});

const SystemParameter = mongoose.model('SystemParameter', SystemParameterSchema);

// 默认系统参数
const defaultParameters = [
  // 基本设置
  { key: 'siteName', name: '站点名称', description: '网站显示的名称', value: 'PonyMind', type: 'string', category: '基本设置', isRequired: true, isEditable: true, defaultValue: 'PonyMind' },
  { key: 'siteDescription', name: '站点描述', description: '网站的描述信息，用于SEO', value: '技术问答与知识分享的专业平台', type: 'string', category: '基本设置', isRequired: true, isEditable: true, defaultValue: '技术问答与知识分享的专业平台' },
  { key: 'siteKeywords', name: '站点关键词', description: '网站的关键词，用逗号分隔', value: '技术,问答,知识分享,编程,开发', type: 'string', category: '基本设置', isRequired: false, isEditable: true, defaultValue: '技术,问答,知识分享,编程,开发' },
  
  // 用户设置
  { key: 'allowRegistration', name: '允许用户注册', description: '是否允许新用户自主注册账号', value: true, type: 'boolean', category: '用户设置', isRequired: true, isEditable: true, defaultValue: true },
  { key: 'requireEmailVerification', name: '邮箱验证', description: '注册时是否需要邮箱验证', value: false, type: 'boolean', category: '用户设置', isRequired: true, isEditable: true, defaultValue: false },
  
  // 内容设置
  { key: 'maxPostsPerDay', name: '每日最大发布数', description: '单个用户每天最多可发布的内容数量', value: 10, type: 'number', category: '内容设置', min: 1, max: 100, unit: '篇', isRequired: true, isEditable: true, defaultValue: 10 },
  { key: 'maxTagsPerPost', name: '每篇内容最大标签数', description: '每篇内容最多可添加的标签数量', value: 5, type: 'number', category: '内容设置', min: 1, max: 20, unit: '个', isRequired: true, isEditable: true, defaultValue: 5 },
  { key: 'enableComments', name: '启用评论功能', description: '是否允许用户对内容进行评论', value: true, type: 'boolean', category: '内容设置', isRequired: true, isEditable: true, defaultValue: true },
  { key: 'enableLikes', name: '启用点赞功能', description: '是否允许用户对内容进行点赞', value: true, type: 'boolean', category: '内容设置', isRequired: true, isEditable: true, defaultValue: true },
  { key: 'enableViews', name: '启用浏览统计', description: '是否统计和显示内容浏览次数', value: true, type: 'boolean', category: '内容设置', isRequired: true, isEditable: true, defaultValue: true },
  
  // 通知设置
  { key: 'enableNotifications', name: '启用站内通知', description: '是否启用站内消息通知功能', value: true, type: 'boolean', category: '通知设置', isRequired: true, isEditable: true, defaultValue: true },
  { key: 'enableEmailNotifications', name: '启用邮件通知', description: '是否发送邮件通知给用户', value: true, type: 'boolean', category: '通知设置', isRequired: true, isEditable: true, defaultValue: true },
  
  // 安全设置
  { key: 'moderationMode', name: '内容审核模式', description: '选择内容发布前的审核方式', value: 'auto', type: 'select', category: '安全设置', options: ['auto', 'manual', 'disabled'], isRequired: true, isEditable: true, defaultValue: 'auto' },
  { key: 'spamFilterEnabled', name: '启用垃圾内容过滤', description: '自动检测和过滤垃圾内容', value: true, type: 'boolean', category: '安全设置', isRequired: true, isEditable: true, defaultValue: true },
  { key: 'maxFileSize', name: '最大文件大小', description: '用户上传文件的最大大小限制', value: 5, type: 'number', category: '安全设置', min: 1, max: 100, unit: 'MB', isRequired: true, isEditable: true, defaultValue: 5 },
  { key: 'allowedFileTypes', name: '允许的文件类型', description: '用户可上传的文件类型，用逗号分隔', value: 'jpg,jpeg,png,gif,pdf,doc,docx', type: 'string', category: '安全设置', isRequired: true, isEditable: true, defaultValue: 'jpg,jpeg,png,gif,pdf,doc,docx' },
  
  // 系统设置
  { key: 'maintenanceMode', name: '维护模式', description: '启用后，只有管理员可以访问网站', value: false, type: 'boolean', category: '系统设置', isRequired: true, isEditable: true, defaultValue: false }
];

async function initSystemParameters() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ponymind';
    console.log('正在连接数据库...');
    await mongoose.connect(mongoUri);
    console.log('✅ 数据库连接成功');

    const existingCount = await SystemParameter.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  数据库中已存在 ${existingCount} 个系统参数`);
      return;
    }

    console.log('正在创建系统参数...');
    const result = await SystemParameter.insertMany(defaultParameters);
    console.log(`✅ 成功创建 ${result.length} 个系统参数`);

    console.log('\n📋 已创建的系统参数:');
    const categories = [...new Set(defaultParameters.map(p => p.category))];
    categories.forEach(category => {
      console.log(`\n${category}:`);
      const categoryParams = defaultParameters.filter(p => p.category === category);
      categoryParams.forEach(param => {
        console.log(`  - ${param.name} (${param.key}): ${param.value}`);
      });
    });

    console.log('\n🎉 系统参数初始化完成！');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

initSystemParameters();
