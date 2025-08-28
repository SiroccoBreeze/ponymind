/**
 * 前端时区处理工具函数
 * 用于前端时间显示和时区转换
 */

/**
 * 将UTC时间转换为用户本地时间显示
 * @param utcTimeString UTC时间字符串
 * @param format 显示格式
 * @returns 本地时间字符串
 */
export function displayLocalTime(
  utcTimeString: string, 
  format: 'full' | 'date' | 'time' | 'datetime' | 'relative' = 'full'
): string {
  if (!utcTimeString) return '';
  
  try {
    const utcDate = new Date(utcTimeString);
    
    if (isNaN(utcDate.getTime())) {
      return '无效时间';
    }

    switch (format) {
      case 'relative':
        return getRelativeTime(utcDate);
      case 'date':
        return utcDate.toLocaleDateString('zh-CN');
      case 'time':
        return utcDate.toLocaleTimeString('zh-CN');
      case 'datetime':
        return utcDate.toLocaleString('zh-CN');
      case 'full':
      default:
        return utcDate.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
    }
  } catch (error) {
    console.error('时间显示转换失败:', error);
    return '时间转换失败';
  }
}

/**
 * 获取相对时间描述
 * @param date 目标时间
 * @returns 相对时间字符串
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return '刚刚';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}

/**
 * 将本地时间转换为UTC时间（用于发送到后端）
 * @param localTimeString 本地时间字符串
 * @param timezone 时区，默认为用户当前时区
 * @returns UTC时间字符串
 */
export function localTimeToUTC(
  localTimeString: string, 
  timezone?: string
): string {
  if (!localTimeString) return '';
  
  try {
    // 标准化输入格式
    let normalizedString = localTimeString;
    
    // 处理 "2025-08-26 16:30:00.000" 格式
    if (normalizedString.includes(' ')) {
      normalizedString = normalizedString.replace(' ', 'T');
    }
    
    // 如果没有秒和毫秒，添加默认值
    if (!normalizedString.includes(':')) {
      normalizedString += ':00';
    }
    
    // 如果没有毫秒，添加默认值
    if (!normalizedString.includes('.')) {
      normalizedString += '.000';
    }

    // 创建本地时间对象
    const localDate = new Date(normalizedString);
    
    if (isNaN(localDate.getTime())) {
      throw new Error('无效的时间格式');
    }

    // 获取用户时区偏移量
    const userTimezone = timezone || getUserTimezone();
    const offsetMinutes = getTimezoneOffset(userTimezone);
    
    // 转换为UTC时间
    const utcDate = new Date(localDate.getTime() - (offsetMinutes * 60 * 1000));
    
    return utcDate.toISOString();
  } catch (error) {
    console.error('本地时间转UTC失败:', error);
    throw new Error(`时间转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 获取用户当前时区
 * @returns 用户当前时区
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('获取用户时区失败:', error);
    return 'Asia/Shanghai'; // 默认返回上海时区
  }
}

/**
 * 获取指定时区的偏移量（分钟）
 * @param timezone 时区名称
 * @returns 时区偏移量（分钟）
 */
function getTimezoneOffset(timezone: string): number {
  try {
    // 创建测试日期
    const testDate = new Date();
    
    // 获取UTC时间
    const utc = testDate.getTime() + (testDate.getTimezoneOffset() * 60000);
    
    // 创建目标时区的时间
    const targetDate = new Date(utc);
    const targetString = targetDate.toLocaleString('en-US', { timeZone: timezone });
    const target = new Date(targetString);
    
    // 计算偏移量
    const offset = (target.getTime() - utc) / 60000;
    
    return offset;
  } catch (error) {
    console.error(`获取时区偏移量失败: ${timezone}`, error);
    // 返回默认偏移量（上海时区 UTC+8）
    return 480;
  }
}

/**
 * 格式化时间选择器的值（用于编辑表单）
 * @param utcTimeString UTC时间字符串
 * @returns datetime-local格式的字符串
 */
export function formatForDateTimeLocal(utcTimeString: string): string {
  if (!utcTimeString) return '';
  
  try {
    const date = new Date(utcTimeString);
    
    if (isNaN(date.getTime())) {
      return '';
    }

    // 转换为本地时间并格式化为datetime-local格式
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('时间格式化失败:', error);
    return '';
  }
}

/**
 * 获取当前本地时间（用于时间选择器默认值）
 * @returns 当前本地时间的datetime-local格式字符串
 */
export function getCurrentLocalTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * 验证时间字符串格式
 * @param timeString 时间字符串
 * @returns 是否有效
 */
export function isValidTimeString(timeString: string): boolean {
  if (!timeString) return false;
  
  try {
    const date = new Date(timeString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * 获取时区信息
 * @param timezone 时区名称
 * @returns 时区信息对象
 */
export function getTimezoneInfo(timezone: string): {
  name: string;
  offset: string;
  offsetMinutes: number;
  currentTime: string;
} {
  try {
    const now = new Date();
    const offsetMinutes = getTimezoneOffset(timezone);
    const offsetHours = Math.abs(offsetMinutes) / 60;
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${String(Math.floor(offsetHours)).padStart(2, '0')}:${String(Math.abs(offsetMinutes) % 60).padStart(2, '0')}`;
    
    // 获取该时区的当前时间
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const currentTime = formatter.format(now);
    
    return {
      name: timezone,
      offset: `UTC${offsetString}`,
      offsetMinutes,
      currentTime
    };
  } catch (error) {
    console.error(`获取时区信息失败: ${timezone}`, error);
    return {
      name: timezone,
      offset: 'UTC+08:00',
      offsetMinutes: 480,
      currentTime: '获取失败'
    };
  }
}

/**
 * 获取常用时区列表
 * @returns 常用时区数组
 */
export function getCommonTimezones(): Array<{
  value: string;
  label: string;
  offset: string;
}> {
  return [
    { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)', offset: 'UTC+08:00' },
    { value: 'Asia/Tokyo', label: '日本标准时间 (UTC+9)', offset: 'UTC+09:00' },
    { value: 'Asia/Seoul', label: '韩国标准时间 (UTC+9)', offset: 'UTC+09:00' },
    { value: 'Asia/Singapore', label: '新加坡时间 (UTC+8)', offset: 'UTC+08:00' },
    { value: 'America/New_York', label: '美国东部时间 (UTC-5)', offset: 'UTC-05:00' },
    { value: 'America/Los_Angeles', label: '美国西部时间 (UTC-8)', offset: 'UTC-08:00' },
    { value: 'Europe/London', label: '英国时间 (UTC+0)', offset: 'UTC+00:00' },
    { value: 'Europe/Paris', label: '欧洲中部时间 (UTC+1)', offset: 'UTC+01:00' },
    { value: 'Australia/Sydney', label: '澳大利亚东部时间 (UTC+10)', offset: 'UTC+10:00' },
    { value: 'Pacific/Auckland', label: '新西兰时间 (UTC+12)', offset: 'UTC+12:00' }
  ];
}
