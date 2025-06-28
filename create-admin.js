/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// 从环境变量获取MongoDB连接字符串
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ 错误: 未找到 MONGODB_URI 环境变量');
  console.log('');
  console.log('请在 .env.local 文件中设置 MONGODB_URI，例如：');
  console.log('MONGODB_URI=mongodb://admin:mongoadmin@localhost:27017/ponymind_db?authSource=admin');
  process.exit(1);
}

async function createAdmin() {
  const client = new MongoClient(MONGODB_URI, {
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  
  try {
    console.log('🚀 PonyMind 管理员账户创建工具');
    console.log('=====================================');
    console.log('正在连接到 MongoDB...');
    console.log('连接字符串:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // 隐藏密码
    
    await client.connect();
    console.log('✅ 连接到 MongoDB 成功');
    
    // 从连接字符串中提取数据库名称
    const dbName = MONGODB_URI.split('/').pop().split('?')[0] || 'ponymind_db';
    console.log('使用数据库:', dbName);
    
    const db = client.db(dbName);
    const users = db.collection('users');
    
    // 检查是否已存在管理员用户
    console.log('检查现有管理员用户...');
    const existingAdmin = await users.findOne({ email: 'admin@ponymind.com' });
    if (existingAdmin) {
      console.log('✅ 管理员用户已存在');
      if (existingAdmin.role !== 'admin') {
        console.log('🔄 更新用户角色为管理员...');
        await users.updateOne(
          { email: 'admin@ponymind.com' },
          { $set: { role: 'admin', status: 'active', updatedAt: new Date() } }
        );
        console.log('✅ 用户角色已更新为管理员');
      } else {
        console.log('ℹ️  用户已经是管理员，无需更新');
      }
      
      console.log('');
      console.log('🔑 现有管理员登录信息:');
      console.log('   邮箱: admin@ponymind.com');
      console.log('   密码: admin123 (如果是首次创建)');
      console.log('');
      console.log('💡 如果忘记密码，可以删除该用户后重新运行此脚本');
      return;
    }
    
    // 创建管理员用户
    console.log('📝 创建新的管理员用户...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = {
      name: '系统管理员',
      email: 'admin@ponymind.com',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      bio: '系统管理员账户',
      avatar: '',
      location: '',
      website: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      posts: []
    };
    
    const result = await users.insertOne(adminUser);
    console.log('✅ 管理员用户创建成功!');
    console.log('用户ID:', result.insertedId);
    console.log('');
    console.log('🔑 登录信息:');
    console.log('   邮箱: admin@ponymind.com');
    console.log('   密码: admin123');
    console.log('');
    console.log('⚠️  重要提醒: 首次登录后请立即修改默认密码!');
    console.log('');
    console.log('🌐 访问管理后台:');
    console.log('   1. 启动应用: npm run dev');
    console.log('   2. 访问: http://localhost:3000');
    console.log('   3. 登录后点击右上角用户菜单中的"管理后台"');
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    console.log('');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 解决方案:');
      console.log('1. 确保 MongoDB 服务正在运行');
      console.log('2. 检查连接地址和端口是否正确');
      console.log('3. 如果使用 Docker: docker run -d --name mongodb -p 27017:27017 mongo:latest');
    } else if (error.message.includes('authentication') || error.message.includes('Authentication')) {
      console.log('💡 解决方案:');
      console.log('1. 检查用户名和密码是否正确');
      console.log('2. 确认 authSource 参数设置正确');
      console.log('3. 示例连接字符串: mongodb://username:password@localhost:27017/database?authSource=admin');
    } else if (error.message.includes('timeout')) {
      console.log('💡 解决方案:');
      console.log('1. 检查网络连接');
      console.log('2. 确认 MongoDB 服务正在运行并可访问');
      console.log('3. 检查防火墙设置');
    } else {
      console.log('💡 详细错误信息:');
      console.log(error);
    }
  } finally {
    try {
      await client.close();
      console.log('🔌 数据库连接已关闭');
    } catch {
      // 忽略关闭连接时的错误
    }
  }
}

createAdmin(); 