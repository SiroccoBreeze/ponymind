import { logger } from './logger';

/**
 * 个人业务操作日志记录示例
 * 展示如何使用pino日志库记录各种业务操作
 */

// 用户相关操作日志示例
export const logUserOperations = {
  // 用户注册
  userRegistration: (userId: string, userEmail: string, data?: Record<string, unknown>) => {
    logger.user('用户注册成功', userId, userEmail, {
      ...data,
      operation: 'registration',
      timestamp: new Date().toISOString()
    });
  },

  // 用户登录
  userLogin: (userId: string, userEmail: string, ip?: string, userAgent?: string) => {
    logger.auth('用户登录成功', userId, userEmail, {
      operation: 'login',
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },

  // 用户登出
  userLogout: (userId: string, userEmail: string) => {
    logger.auth('用户登出', userId, userEmail, {
      operation: 'logout',
      timestamp: new Date().toISOString()
    });
  },

  // 用户资料更新
  profileUpdate: (userId: string, userEmail: string, updatedFields: string[]) => {
    logger.user('用户资料更新', userId, userEmail, {
      operation: 'profile_update',
      updatedFields,
      timestamp: new Date().toISOString()
    });
  },

  // 用户状态变更
  statusChange: (userId: string, userEmail: string, oldStatus: string, newStatus: string) => {
    logger.userStatus('用户状态变更', userId, userEmail, {
      operation: 'status_change',
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString()
    });
  }
};

// 内容管理操作日志示例
export const logContentOperations = {
  // 创建帖子
  createPost: (userId: string, userEmail: string, postId: string, title: string) => {
    logger.user('创建新帖子', userId, userEmail, {
      operation: 'create_post',
      postId,
      title,
      timestamp: new Date().toISOString()
    });
  },

  // 更新帖子
  updatePost: (userId: string, userEmail: string, postId: string, updatedFields: string[]) => {
    logger.user('更新帖子', userId, userEmail, {
      operation: 'update_post',
      postId,
      updatedFields,
      timestamp: new Date().toISOString()
    });
  },

  // 删除帖子
  deletePost: (userId: string, userEmail: string, postId: string, title: string) => {
    logger.user('删除帖子', userId, userEmail, {
      operation: 'delete_post',
      postId,
      title,
      timestamp: new Date().toISOString()
    });
  },

  // 添加评论
  addComment: (userId: string, userEmail: string, commentId: string, postId: string) => {
    logger.user('添加评论', userId, userEmail, {
      operation: 'add_comment',
      commentId,
      postId,
      timestamp: new Date().toISOString()
    });
  },

  // 创建事件
  createEvent: (userId: string, userEmail: string, eventId: string, eventName: string) => {
    logger.event('创建新事件', userId, userEmail, {
      operation: 'create_event',
      eventId,
      eventName,
      timestamp: new Date().toISOString()
    });
  },

  // 创建资源
  createResource: (userId: string, userEmail: string, resourceId: string, resourceName: string, category: string) => {
    logger.resource('创建新资源', userId, userEmail, {
      operation: 'create_resource',
      resourceId,
      resourceName,
      category,
      timestamp: new Date().toISOString()
    });
  }
};

// 文件操作日志示例
export const logFileOperations = {
  // 文件上传
  fileUpload: (userId: string, userEmail: string, fileName: string, fileSize: number, fileType: string) => {
    logger.user('文件上传成功', userId, userEmail, {
      operation: 'file_upload',
      fileName,
      fileSize,
      fileType,
      timestamp: new Date().toISOString()
    });
  },

  // 文件删除
  fileDelete: (userId: string, userEmail: string, fileName: string, filePath: string) => {
    logger.file('文件删除', {
      operation: 'file_delete',
      userId,
      userEmail,
      fileName,
      filePath,
      timestamp: new Date().toISOString()
    });
  },

  // 文件下载
  fileDownload: (userId: string, userEmail: string, fileName: string, filePath: string) => {
    logger.file('文件下载', {
      operation: 'file_download',
      userId,
      userEmail,
      fileName,
      filePath,
      timestamp: new Date().toISOString()
    });
  }
};

// 搜索和标签操作日志示例
export const logSearchAndTagOperations = {
  // 搜索操作
  searchQuery: (userId: string, userEmail: string, query: string, resultsCount: number, filters?: Record<string, unknown>) => {
    logger.search('执行搜索查询', userId, userEmail, {
      operation: 'search_query',
      query,
      resultsCount,
      filters,
      timestamp: new Date().toISOString()
    });
  },

  // 标签创建
  createTag: (userId: string, userEmail: string, tagName: string, tagId: string) => {
    logger.tag('创建新标签', userId, userEmail, {
      operation: 'create_tag',
      tagName,
      tagId,
      timestamp: new Date().toISOString()
    });
  },

  // 标签应用
  applyTag: (userId: string, userEmail: string, tagName: string, targetType: string, targetId: string) => {
    logger.tag('应用标签', userId, userEmail, {
      operation: 'apply_tag',
      tagName,
      targetType,
      targetId,
      timestamp: new Date().toISOString()
    });
  }
};

// 系统操作日志示例
export const logSystemOperations = {
  // 系统参数变更
  systemParameterChange: (userId: string, userEmail: string, parameterName: string, oldValue: unknown, newValue: unknown) => {
    logger.systemParameter('系统参数变更', userId, userEmail, {
      operation: 'parameter_change',
      parameterName,
      oldValue,
      newValue,
      timestamp: new Date().toISOString()
    });
  },

  // 定时任务执行
  scheduledTaskExecution: (taskName: string, executionTime: number, success: boolean, result?: unknown) => {
    logger.scheduledTask('定时任务执行', {
      operation: 'task_execution',
      taskName,
      executionTime,
      success,
      result,
      timestamp: new Date().toISOString()
    });
  },

  // 性能监控
  performanceMetric: (metricName: string, value: number, unit: string, context?: Record<string, unknown>) => {
    logger.performance('性能指标记录', {
      operation: 'performance_metric',
      metricName,
      value,
      unit,
      context,
      timestamp: new Date().toISOString()
    });
  }
};

// 安全相关日志示例
export const logSecurityOperations = {
  // 登录失败
  loginFailure: (userEmail: string, ip: string, reason: string) => {
    logger.security('登录失败', undefined, userEmail, {
      operation: 'login_failure',
      ip,
      reason,
      timestamp: new Date().toISOString()
    });
  },

  // 权限拒绝
  permissionDenied: (userId: string, userEmail: string, action: string, resource: string, ip?: string) => {
    logger.security('权限拒绝', userId, userEmail, {
      operation: 'permission_denied',
      action,
      resource,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  // 可疑活动
  suspiciousActivity: (userId: string, userEmail: string, activity: string, riskLevel: 'low' | 'medium' | 'high') => {
    logger.security('检测到可疑活动', userId, userEmail, {
      operation: 'suspicious_activity',
      activity,
      riskLevel,
      timestamp: new Date().toISOString()
    });
  }
};

// 用户行为分析日志示例
export const logUserBehavior = {
  // 页面访问
  pageVisit: (userId: string, userEmail: string, pagePath: string, duration: number, referrer?: string) => {
    logger.behavior('页面访问', userId, userEmail, {
      operation: 'page_visit',
      pagePath,
      duration,
      referrer,
      timestamp: new Date().toISOString()
    });
  },

  // 功能使用
  featureUsage: (userId: string, userEmail: string, feature: string, action: string, context?: Record<string, unknown>) => {
    logger.behavior('功能使用', userId, userEmail, {
      operation: 'feature_usage',
      feature,
      action,
      context,
      timestamp: new Date().toISOString()
    });
  },

  // 用户偏好
  userPreference: (userId: string, userEmail: string, preference: string, value: unknown) => {
    logger.behavior('用户偏好设置', userId, userEmail, {
      operation: 'preference_setting',
      preference,
      value,
      timestamp: new Date().toISOString()
    });
  }
};

// 消息和通知日志示例
export const logMessageOperations = {
  // 发送消息
  sendMessage: (userId: string, userEmail: string, messageId: string, recipientId: string, messageType: string) => {
    logger.message('发送消息', userId, userEmail, {
      operation: 'send_message',
      messageId,
      recipientId,
      messageType,
      timestamp: new Date().toISOString()
    });
  },

  // 接收消息
  receiveMessage: (userId: string, userEmail: string, messageId: string, senderId: string, messageType: string) => {
    logger.message('接收消息', userId, userEmail, {
      operation: 'receive_message',
      messageId,
      senderId,
      messageType,
      timestamp: new Date().toISOString()
    });
  }
};

// 设置变更日志示例
export const logSettingsOperations = {
  // 用户设置变更
  userSettingsChange: (userId: string, userEmail: string, setting: string, oldValue: unknown, newValue: unknown) => {
    logger.settings('用户设置变更', userId, userEmail, {
      operation: 'settings_change',
      setting,
      oldValue,
      newValue,
      timestamp: new Date().toISOString()
    });
  },

  // 系统设置变更
  systemSettingsChange: (userId: string, userEmail: string, setting: string, oldValue: unknown, newValue: unknown) => {
    logger.settings('系统设置变更', userId, userEmail, {
      operation: 'system_settings_change',
      setting,
      oldValue,
      newValue,
      timestamp: new Date().toISOString()
    });
  }
};

// 导出所有日志记录函数
export const businessLogger = {
  user: logUserOperations,
  content: logContentOperations,
  file: logFileOperations,
  search: logSearchAndTagOperations,
  system: logSystemOperations,
  security: logSecurityOperations,
  behavior: logUserBehavior,
  message: logMessageOperations,
  settings: logSettingsOperations
};
