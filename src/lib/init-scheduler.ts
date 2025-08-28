import scheduler from './scheduler';
import connectDB from './mongodb';
import ScheduledTask from '@/models/ScheduledTask';

// 防止重复初始化的锁
let isInitializing = false;
let hasInitialized = false;

// 初始化默认的定时任务
async function initializeDefaultTasks() {
  // 防止重复执行
  if (isInitializing) {
    console.log('⏳ 定时任务初始化正在进行中，跳过重复执行');
    return;
  }
  
  if (hasInitialized) {
    console.log('✅ 定时任务已经初始化过，跳过重复执行');
    return;
  }
  
  isInitializing = true;
  
  try {
    console.log('🚀 开始初始化定时任务...');
    await connectDB();
    
    // 检查是否已存在默认任务（包括已删除的）
    const existingTasks = await ScheduledTask.find({
      taskType: { $in: ['cleanupUnusedImages', 'updateInactiveUsers'] }
    });
    
    console.log(`📊 当前系统中存在的任务类型: ${existingTasks.map(t => t.taskType).join(', ')}`);

    // 如果没有清理图片的任务，创建一个默认的
    if (!existingTasks.find(task => task.taskType === 'cleanupUnusedImages')) {
      console.log('🔍 检查清理图片任务...');
      // 检查是否已存在同名任务（包括已删除的）
      const existingTaskWithSameName = await ScheduledTask.findOne({ 
        name: '清理未使用图片'
      });
      
      if (!existingTaskWithSameName) {
        console.log('➕ 创建默认的图片清理任务...');
        const defaultCleanupTask = new ScheduledTask({
          name: '清理未使用图片',
          description: '定期清理系统中未被使用的图片文件，释放存储空间',
          taskType: 'cleanupUnusedImages',
          isEnabled: false, // 默认停用，需要管理员手动启用
          schedule: '0 2 * * *', // 每天凌晨2点执行
          nextRun: new Date(new Date().setHours(2, 0, 0, 0) + 24 * 60 * 60 * 1000), // 明天凌晨2点
          status: 'idle',
          config: {}
        });

        await defaultCleanupTask.save();
        console.log('✅ 已创建默认的图片清理任务（已停用）');
      } else {
        console.log('ℹ️  已存在同名任务，跳过创建');
      }
    } else {
      console.log('ℹ️  清理图片任务已存在，跳过创建');
    }

    // 如果没有更新非活跃用户的任务，创建一个默认的
    if (!existingTasks.find(task => task.taskType === 'updateInactiveUsers')) {
      console.log('🔍 检查更新非活跃用户任务...');
      // 检查是否已存在同名任务（包括已删除的）
      const existingTaskWithSameName = await ScheduledTask.findOne({ 
        name: '更新非活跃用户状态'
      });
      
      if (!existingTaskWithSameName) {
        console.log('➕ 创建默认的非活跃用户状态更新任务...');
        const defaultUpdateUsersTask = new ScheduledTask({
          name: '更新非活跃用户状态',
          description: '定期检查并更新半个月内未登录的用户状态为非活跃',
          taskType: 'updateInactiveUsers',
          isEnabled: false, // 默认停用，需要管理员手动启用
          schedule: '0 3 * * *', // 每天凌晨3点执行
          nextRun: new Date(new Date().setHours(3, 0, 0, 0) + 24 * 60 * 60 * 1000), // 明天凌晨3点
          status: 'idle',
          config: {}
        });

        await defaultUpdateUsersTask.save();
        console.log('✅ 已创建默认的非活跃用户状态更新任务（已停用）');
      } else {
        console.log('ℹ️  已存在同名任务，跳过创建');
      }
    } else {
      console.log('ℹ️  更新非活跃用户任务已存在，跳过创建');
    }

    hasInitialized = true;
    console.log('✅ 定时任务初始化完成');
    console.log('ℹ️  注意：新创建的默认定时任务默认已停用，请在管理界面手动启用');
  } catch (error) {
    console.error('❌ 定时任务初始化失败:', error);
  } finally {
    isInitializing = false;
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

// 重置初始化状态（用于测试或特殊情况）
export function resetInitialization() {
  hasInitialized = false;
  isInitializing = false;
  console.log('🔄 定时任务初始化状态已重置');
}

// 检查初始化状态
export function getInitializationStatus() {
  return {
    isInitializing,
    hasInitialized
  };
} 