// 测试定时任务功能
const { MongoClient } = require('mongodb');

async function testScheduler() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ponymind';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ 连接到数据库成功');

    const db = client.db();
    const tasksCollection = db.collection('scheduledtasks');

    // 创建测试任务
    const testTask = {
      name: '测试清理任务',
      description: '这是一个测试任务',
      taskType: 'cleanupUnusedImages',
      isEnabled: true,
      schedule: '0 2 * * *',
      nextRun: new Date(Date.now() + 60000), // 1分钟后执行
      status: 'idle',
      lastResult: {
        success: false,
        message: '',
        duration: 0
      },
      config: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 插入测试任务
    const result = await tasksCollection.insertOne(testTask);
    console.log('✅ 测试任务创建成功:', result.insertedId);

    // 查询任务
    const tasks = await tasksCollection.find({}).toArray();
    console.log('📋 当前任务列表:');
    tasks.forEach(task => {
      console.log(`  - ${task.name} (${task.taskType}) - ${task.status}`);
    });

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await client.close();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行测试
testScheduler(); 