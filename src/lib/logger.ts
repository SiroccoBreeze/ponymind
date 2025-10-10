import pino from 'pino';
import { ILog } from '@/models/Log';
import Log from '@/models/Log';
import connectDB from './mongodb';
import { getCurrentUTCTime } from './time-utils';

// 创建Pino日志实例
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // 简化配置，避免worker线程问题
  base: null,
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  // 在开发环境中使用简单的控制台输出
  ...(process.env.NODE_ENV === 'development' ? {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: true
      },
    },
  } : {}),
});

// 自定义日志记录器，同时写入Pino和MongoDB
class Logger {
  private async saveToDatabase(logData: Partial<ILog>) {
    try {
      await connectDB();
      const log = new Log(logData);
      await log.save();
    } catch (error) {
      // 如果数据库保存失败，只记录到控制台
      console.error('Failed to save log to database:', error);
    }
  }

  info(message: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      console.log(`[INFO] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'system',
      metadata: data,
    });
  }

  warn(message: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.warn(data, message);
      } else {
        pinoLogger.warn(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.warn(`[WARN] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'warn',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'system',
      metadata: data,
    });
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.error(data, message);
      } else {
        pinoLogger.error(message);
      }
    } catch (pinoError) {
      // 如果Pino logger失败，直接使用console.error作为降级方案
      console.error(`[ERROR] ${message}`, data || {});
      if (pinoError instanceof Error) {
        console.error('Pino logger error:', pinoError.message);
      }
    }
    
    const logData: Partial<ILog> = {
      level: 'error',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'system',
      metadata: data,
    };

    if (error) {
      if (error instanceof Error) {
        logData.stack = error.stack;
        logData.metadata = { ...data, errorMessage: error.message, errorName: error.name };
      } else {
        logData.metadata = { ...data, error: error };
      }
    }

    this.saveToDatabase(logData);
  }

  debug(message: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.debug(data, message);
      } else {
        pinoLogger.debug(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[DEBUG] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'debug',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'system',
      metadata: data,
    });
  }

  // 记录API请求日志
  api(message: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[API] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'api',
      metadata: data,
    });
  }

  // 记录用户操作日志
  user(message: string, userId?: string, userEmail?: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[USER] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'user',
      userId,
      userEmail,
      metadata: data,
    });
  }

  // 记录认证相关日志
  auth(message: string, userId?: string, userEmail?: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[AUTH] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'auth',
      userId,
      userEmail,
      metadata: data,
    });
  }

  // 记录数据库操作日志
  database(message: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[DATABASE] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'database',
      metadata: data,
    });
  }

  // 记录文件操作日志
  file(message: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[FILE] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'file',
      metadata: data,
    });
  }

  // 记录管理员操作日志
  admin(message: string, userId?: string, userEmail?: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[ADMIN] ${message}`, message);
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'admin',
      userId,
      userEmail,
      metadata: data,
    });
  }

  // 记录用户行为日志
  behavior(message: string, userId?: string, userEmail?: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[BEHAVIOR] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'behavior',
      userId,
      userEmail,
      metadata: data,
    });
  }

  // 记录资源相关操作日志
  resource(message: string, userId?: string, userEmail?: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[RESOURCE] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'resource',
      userId,
      userEmail,
      metadata: data,
    });
  }

  // 记录事件相关操作日志
  event(message: string, userId?: string, userEmail?: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[EVENT] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'event',
      userId,
      userEmail,
      metadata: data,
    });
  }

  // 记录标签相关操作日志
  tag(message: string, userId?: string, userEmail?: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[TAG] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'tag',
      userId,
      userEmail,
      metadata: data,
    });
  }

  // 记录消息相关操作日志
  message(message: string, userId?: string, userEmail?: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[MESSAGE] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'message',
      userId,
      userEmail,
      metadata: data,
    });
  }

  // 记录搜索操作日志
  search(message: string, userId?: string, userEmail?: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[SEARCH] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'search',
      userId,
      userEmail,
      metadata: data,
    });
  }

  // 记录设置变更日志
  settings(message: string, userId?: string, userEmail?: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[SETTINGS] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'settings',
      userId,
      userEmail,
      metadata: data,
    });
  }

  // 记录定时任务日志
  scheduledTask(message: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[SCHEDULED_TASK] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'scheduled_task',
      metadata: data,
    });
  }

  // 记录系统参数变更日志
  systemParameter(message: string, userId?: string, userEmail?: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[SYSTEM_PARAMETER] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'system_parameter',
      userId,
      userEmail,
      metadata: data,
    });
  }

  // 记录用户状态变更日志
  userStatus(message: string, userId?: string, userEmail?: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[USER_STATUS] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'user_status',
      userId,
      userEmail,
      metadata: data,
    });
  }

  // 记录性能监控日志
  performance(message: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.log(`[PERFORMANCE] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'info',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'performance',
      metadata: data,
    });
  }

  // 记录安全相关日志
  security(message: string, userId?: string, userEmail?: string, data?: Record<string, unknown>) {
    try {
      if (data) {
        pinoLogger.warn(data, message);
      } else {
        pinoLogger.warn(message);
      }
    } catch (pinoError) {
      // 如果 Pino 日志失败，使用 console 作为降级方案
      console.warn(`[SECURITY] ${message}`, data || {});
      console.error('Pino logger error:', pinoError);
    }
    
    this.saveToDatabase({
      level: 'warn',
      message,
      timestamp: getCurrentUTCTime(),
      category: 'security',
      userId,
      userEmail,
      metadata: data,
    });
  }
}

// 导出单例实例
export const logger = new Logger();

// 导出Pino实例（如果需要直接使用Pino）
export { pinoLogger };

// 默认导出
export default logger;
