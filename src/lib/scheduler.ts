import connectDB from './mongodb';
import ScheduledTask from '@/models/ScheduledTask';
import { cleanupUnusedImages } from './cascade-delete';

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
      
      const now = new Date();
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
        lastRun: new Date()
      });

      let result: TaskResult;

      // 根据任务类型执行相应的操作
      switch (task.taskType) {
        case 'cleanupUnusedImages':
          result = await this.executeCleanupUnusedImages(task);
          break;
        case 'autoCloseQuestions':
          result = await this.executeAutoCloseQuestions(task);
          break;
        case 'cleanupLogs':
          result = await this.executeCleanupLogs(task);
          break;
        case 'backupDatabase':
          result = await this.executeBackupDatabase(task);
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
      
      // 这里我们需要重新实现清理逻辑，因为原来的函数没有返回值
      await connectDB();
      
      // 查找所有图片记录
      const Image = (await import('@/models/Image')).default;
      const Post = (await import('@/models/Post')).default;
      const Comment = (await import('@/models/Comment')).default;
      
      const allImages = await Image.find({});
      console.log(`检查 ${allImages.length} 张图片的使用情况`);
      
      // 查找所有文章和评论
      const allPosts = await Post.find({}, 'content');
      const allComments = await Comment.find({}, 'content images');
      
      // 收集所有正在使用的图片URL
      const usedImageUrls = new Set<string>();
      
      // 从文章内容中提取
      for (const post of allPosts) {
        const imageUrls = this.extractImagesFromContent(post.content);
        imageUrls.forEach(url => usedImageUrls.add(url));
      }
      
      // 从评论内容和图片字段中提取
      for (const comment of allComments) {
        const imageUrls = this.extractImagesFromContent(comment.content);
        imageUrls.forEach(url => usedImageUrls.add(url));
        
        if (comment.images) {
          comment.images.forEach((url: string) => usedImageUrls.add(url));
        }
      }
      
      // 找出未使用的图片
      const unusedImages = allImages.filter(image => !usedImageUrls.has(image.url));
      console.log(`发现 ${unusedImages.length} 张未使用的图片`);
      
      // 删除未使用的图片
      let deletedCount = 0;
      for (const image of unusedImages) {
        try {
          const { unlink } = await import('fs/promises');
          const { existsSync } = await import('fs');
          
          // 删除物理文件
          if (existsSync(image.path)) {
            await unlink(image.path);
            console.log(`已删除未使用的物理文件: ${image.path}`);
          }
          
          // 删除数据库记录
          await Image.findByIdAndDelete(image._id);
          console.log(`已删除未使用的图片记录: ${image.url}`);
          
          deletedCount++;
        } catch (error) {
          console.error(`删除未使用图片失败: ${image.url}`, error);
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`清理完成，删除了 ${deletedCount} 张未使用的图片`);
      
      return {
        success: true,
        message: `成功清理了 ${deletedCount} 张未使用的图片`,
        details: {
          totalImages: allImages.length,
          unusedImages: unusedImages.length,
          deletedImages: deletedCount
        },
        duration
      };
      
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

  private async executeAutoCloseQuestions(task: any): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔒 开始自动关闭过期问题...');
      
      // 这里实现自动关闭问题的逻辑
      // 暂时返回成功，具体实现可以根据需求添加
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        message: '自动关闭问题功能待实现',
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        message: error instanceof Error ? error.message : '自动关闭失败',
        duration
      };
    }
  }

  private async executeCleanupLogs(task: any): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      console.log('📝 开始清理日志...');
      
      // 这里实现清理日志的逻辑
      // 暂时返回成功，具体实现可以根据需求添加
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        message: '清理日志功能待实现',
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        message: error instanceof Error ? error.message : '清理日志失败',
        duration
      };
    }
  }

  private async executeBackupDatabase(task: any): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      console.log('💾 开始备份数据库...');
      
      // 这里实现数据库备份的逻辑
      // 暂时返回成功，具体实现可以根据需求添加
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        message: '数据库备份功能待实现',
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        message: error instanceof Error ? error.message : '备份失败',
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
      // 只处理本站上传的图片 (以 /uploads/images/ 开头)
      if (imageUrl.startsWith('/uploads/images/')) {
        imageUrls.push(imageUrl);
      }
    }
    
    // 匹配HTML img标签: <img src="url">
    const htmlImageRegex = /<img[^>]+src="([^"]+)"/g;
    
    while ((match = htmlImageRegex.exec(content)) !== null) {
      const imageUrl = match[1];
      // 只处理本站上传的图片
      if (imageUrl.startsWith('/uploads/images/')) {
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
    const now = new Date();
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
        lastRun: new Date()
      });

      let result: TaskResult;

      // 根据任务类型执行相应的操作
      switch (task.taskType) {
        case 'cleanupUnusedImages':
          result = await this.executeCleanupUnusedImages(task);
          break;
        case 'autoCloseQuestions':
          result = await this.executeAutoCloseQuestions(task);
          break;
        case 'cleanupLogs':
          result = await this.executeCleanupLogs(task);
          break;
        case 'backupDatabase':
          result = await this.executeBackupDatabase(task);
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