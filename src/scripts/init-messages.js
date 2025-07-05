// 为现有用户创建欢迎消息的初始化脚本
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ponymind';

async function initializeWelcomeMessages() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('已连接到MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    const messagesCollection = db.collection('messages');
    
    // 查找所有用户
    const users = await usersCollection.find({}).toArray();
    console.log(`找到 ${users.length} 个用户`);
    
    // 为每个用户创建欢迎消息
    const welcomeMessages = users.map(user => ({
      recipient: user._id,
      sender: null,
      type: 'info',
      title: '欢迎加入PonyMind社区',
      content: '感谢您注册PonyMind！开始分享您的知识和经验吧。记得完善您的个人资料哦。',
      relatedId: null,
      relatedType: null,
      isRead: false,
      priority: 'normal',
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    // 检查是否已经有欢迎消息
    const existingWelcomeMessages = await messagesCollection.find({
      type: 'info',
      title: '欢迎加入PonyMind社区'
    }).toArray();
    
    if (existingWelcomeMessages.length > 0) {
      console.log('欢迎消息已存在，跳过创建');
    } else {
      // 插入欢迎消息
      const result = await messagesCollection.insertMany(welcomeMessages);
      console.log(`成功创建 ${result.insertedCount} 条欢迎消息`);
    }
    
    // 创建系统更新通知
    const systemMessages = users.map(user => ({
      recipient: user._id,
      sender: null,
      type: 'info',
      title: '功能更新通知',
      content: '我们更新了评论系统，现在支持图片上传和用户间回复。同时优化了消息通知功能，快来体验吧！',
      relatedId: null,
      relatedType: null,
      isRead: false,
      priority: 'low',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }));
    
    const existingSystemMessages = await messagesCollection.find({
      type: 'info',
      title: '功能更新通知'
    }).toArray();
    
    if (existingSystemMessages.length > 0) {
      console.log('系统更新通知已存在，跳过创建');
    } else {
      const systemResult = await messagesCollection.insertMany(systemMessages);
      console.log(`成功创建 ${systemResult.insertedCount} 条系统更新通知`);
    }
    
    console.log('消息初始化完成');
    
  } catch (error) {
    console.error('初始化消息失败:', error);
  } finally {
    await client.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeWelcomeMessages();
}

module.exports = { initializeWelcomeMessages }; 