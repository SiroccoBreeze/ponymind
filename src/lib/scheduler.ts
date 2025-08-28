import connectDB from './mongodb';
import ScheduledTask from '@/models/ScheduledTask';
import { getCurrentUTCTime } from './time-utils';

interface TaskResult {
  success: boolean;
  message: string;
  details?: any;
  duration: number;
}

class TaskScheduler {
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.start();
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 定时任务调度器已启动');
    
    // 每分钟检查一次需要执行的任务
    this.interval = setInterval(async () => {
      await this.checkAndRunTasks();
    }, 60000); // 60秒
    
    // 立即执行一次检查
    await this.checkAndRunTasks();
  }

  async stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('🛑 定时任务调度器已停止');
  }

  private async checkAndRunTasks() {
    try {
      await connectDB();
      
      const now = getCurrentUTCTime();
      const tasksToRun = await ScheduledTask.find({
        isEnabled: true,
        nextRun: { $lte: now },
        status: { $ne: 'running' }
      });

      for (const task of tasksToRun) {
        await this.runTask(task);
      }
    } catch (error) {
      console.error('检查定时任务失败:', error);
    }
  }

  private async runTask(task: any) {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 开始执行任务: ${task.name}`);
      
      // 更新任务状态为运行中
      await ScheduledTask.findByIdAndUpdate(task._id, {
        status: 'running',
        lastRun: getCurrentUTCTime()
      });

      let result: TaskResult;

      // 根据任务类型执行相应的操作
      switch (task.taskType) {
        case 'cleanupUnusedImages':
          result = await this.executeCleanupUnusedImages(task);
          break;
        case 'updateInactiveUsers':
          result = await this.executeUpdateInactiveUsers(task);
          break;
        default:
          result = {
            success: false,
            message: `未知的任务类型: ${task.taskType}`,
            duration: Date.now() - startTime
          };
      }

      // 计算下次执行时间
      const nextRun = this.calculateNextRun(task.schedule);

      // 更新任务状态和结果
      await ScheduledTask.findByIdAndUpdate(task._id, {
        status: result.success ? 'completed' : 'failed',
        lastResult: result,
        nextRun: nextRun
      });

      console.log(`✅ 任务执行完成: ${task.name} - ${result.message}`);

    } catch (error) {
      console.error(`❌ 任务执行失败: ${task.name}`, error);
      
      // 更新任务状态为失败
      await ScheduledTask.findByIdAndUpdate(task._id, {
        status: 'failed',
        lastResult: {
          success: false,
          message: error instanceof Error ? error.message : '未知错误',
          duration: Date.now() - startTime
        }
      });
    }
  }

  private async executeCleanupUnusedImages(task: any): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧹 开始清理未使用的图片...');
      
      // 使用改进的清理逻辑
      const { improvedCleanupUnusedImages } = await import('./improved-cleanup');
      const result = await improvedCleanupUnusedImages();
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`✅ 清理完成: ${result.message}`);
        return {
          success: true,
          message: result.message,
          details: {
            ...result.details,
            duration
          },
          duration
        };
      } else {
        console.error(`❌ 清理失败: ${result.message}`);
        return {
          success: false,
          message: result.message,
          details: result.details,
          duration
        };
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('清理未使用图片失败:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : '清理失败',
        duration
      };
    }
  }

  private async executeUpdateInactiveUsers(task: any): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      console.log('👥 开始更新非活跃用户状态...');
      
      // 使用新的清理逻辑
      const { updateInactiveUsers } = await import('./improved-cleanup');
      const result = await updateInactiveUsers();
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`✅ 非活跃用户状态更新完成: ${result.message}`);
        return {
          success: true,
          message: result.message,
          details: {
            ...result.details,
            duration
          },
          duration
        };
      } else {
        console.error(`❌ 非活跃用户状态更新失败: ${result.message}`);
        return {
          success: false,
          message: result.message,
          details: result.details,
          duration
        };
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('更新非活跃用户状态失败:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : '更新失败',
        duration
      };
    }
  }



  private extractImagesFromContent(content: string): string[] {
    const imageUrls: string[] = [];
    
    // 匹配markdown图片语法: ![alt](url)
    const markdownImageRegex = /!\[.*?\]\(([^)]+)\)/g;
    let match;
    
    while ((match = markdownImageRegex.exec(content)) !== null) {
      const imageUrl = match[1];
      // 处理API格式的图片URL
      if (imageUrl.startsWith('/api/images/') || imageUrl.includes('/api/images/')) {
        imageUrls.push(imageUrl);
      }
    }
    
    // 匹配HTML img标签: <img src="url">
    const htmlImageRegex = /<img[^>]+src="([^"]+)"/g;
    
    while ((match = htmlImageRegex.exec(content)) !== null) {
      const imageUrl = match[1];
      // 处理API格式的图片URL
      if (imageUrl.startsWith('/api/images/') || imageUrl.includes('/api/images/')) {
        imageUrls.push(imageUrl);
      }
    }
    
    return [...new Set(imageUrls)]; // 去重
  }

  private calculateNextRun(cronExpression: string): Date {
    // 简单的cron表达式解析，支持基本的格式
    // 格式: "分钟 小时 日 月 星期"
    // 例如: "0 2 * * *" 表示每天凌晨2点
    
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) {
      throw new Error('无效的cron表达式格式');
    }
    
    const [minute, hour, day, month, weekday] = parts;
    const now = getCurrentUTCTime();
    let nextRun = new Date(now);
    
    // 设置分钟
    if (minute !== '*') {
      nextRun.setMinutes(parseInt(minute), 0, 0);
    } else {
      nextRun.setMinutes(0, 0, 0);
    }
    
    // 设置小时
    if (hour !== '*') {
      nextRun.setHours(parseInt(hour));
    } else {
      nextRun.setHours(0);
    }
    
    // 如果计算出的时间已经过去，则设置为明天
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun;
  }

  // 手动执行任务
  async runTaskManually(taskId: string): Promise<TaskResult> {
    const startTime = Date.now();
    let task: any = null;
    
    try {
      await connectDB();
      
      task = await ScheduledTask.findById(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }
      
      console.log(`🔄 手动执行任务: ${task.name}`);
      
      // 更新任务状态为运行中
      await ScheduledTask.findByIdAndUpdate(task._id, {
        status: 'running',
        lastRun: getCurrentUTCTime()
      });

      let result: TaskResult;

      // 根据任务类型执行相应的操作
      switch (task.taskType) {
        case 'cleanupUnusedImages':
          result = await this.executeCleanupUnusedImages(task);
          break;
        case 'updateInactiveUsers':
          result = await this.executeUpdateInactiveUsers(task);
          break;
        default:
          result = {
            success: false,
            message: `未知的任务类型: ${task.taskType}`,
            duration: Date.now() - startTime
          };
      }

      // 计算下次执行时间
      const nextRun = this.calculateNextRun(task.schedule);

      // 更新任务状态和结果
      await ScheduledTask.findByIdAndUpdate(task._id, {
        status: result.success ? 'completed' : 'failed',
        lastResult: result,
        nextRun: nextRun
      });

      console.log(`✅ 手动任务执行完成: ${task.name} - ${result.message}`);
      
      return result;
      
    } catch (error) {
      console.error('手动执行任务失败:', error);
      
      const errorResult: TaskResult = {
        success: false,
        message: error instanceof Error ? error.message : '未知错误',
        duration: Date.now() - startTime
      };
      
      // 如果任务存在，更新其状态
      if (task) {
        await ScheduledTask.findByIdAndUpdate(task._id, {
          status: 'failed',
          lastResult: errorResult
        });
      }
      
      return errorResult;
    }
  }

  // 获取所有任务
  async getAllTasks() {
    await connectDB();
    return await ScheduledTask.find().sort({ createdAt: -1 });
  }

  // 创建新任务
  async createTask(taskData: any) {
    await connectDB();
    
    const nextRun = this.calculateNextRun(taskData.schedule);
    
    const task = new ScheduledTask({
      ...taskData,
      nextRun
    });
    
    return await task.save();
  }

  // 更新任务
  async updateTask(taskId: string, updateData: any) {
    await connectDB();
    
    if (updateData.schedule) {
      updateData.nextRun = this.calculateNextRun(updateData.schedule);
    }
    
    return await ScheduledTask.findByIdAndUpdate(taskId, updateData, { new: true });
  }

  // 删除任务
  async deleteTask(taskId: string) {
    await connectDB();
    return await ScheduledTask.findByIdAndDelete(taskId);
  }
}

// 创建全局实例
const scheduler = new TaskScheduler();

export default scheduler; 