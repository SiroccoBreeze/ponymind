import scheduler from './scheduler';
import connectDB from './mongodb';
import ScheduledTask from '@/models/ScheduledTask';

// 初始化默认的定时任务
async function initializeDefaultTasks() {
  try {
    await connectDB();
    
    // 检查是否已存在默认任务
    const existingTasks = await ScheduledTask.find({
      taskType: { $in: ['cleanupUnusedImages'] }
    });

    // 如果没有清理图片的任务，创建一个默认的
    if (!existingTasks.find(task => task.taskType === 'cleanupUnusedImages')) {
      const defaultCleanupTask = new ScheduledTask({
        name: '清理未使用图片',
        description: '定期清理系统中未被使用的图片文件，释放存储空间',
        taskType: 'cleanupUnusedImages',
        isEnabled: true,
        schedule: '0 2 * * *', // 每天凌晨2点执行
        nextRun: new Date(new Date().setHours(2, 0, 0, 0) + 24 * 60 * 60 * 1000), // 明天凌晨2点
        status: 'idle',
        config: {}
      });

      await defaultCleanupTask.save();
      console.log('✅ 已创建默认的图片清理任务');
    }

    console.log('✅ 定时任务初始化完成');
  } catch (error) {
    console.error('❌ 定时任务初始化失败:', error);
  }
}

// 启动调度器
export async function startScheduler() {
  try {
    // 初始化默认任务
    await initializeDefaultTasks();
    
    // 启动调度器
    await scheduler.start();
    
    console.log('🚀 定时任务调度器已启动');
  } catch (error) {
    console.error('❌ 启动定时任务调度器失败:', error);
  }
}

// 停止调度器
export async function stopScheduler() {
  try {
    await scheduler.stop();
    console.log('🛑 定时任务调度器已停止');
  } catch (error) {
    console.error('❌ 停止定时任务调度器失败:', error);
  }
} 