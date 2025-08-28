/**
 * 时间处理工具函数
 * 支持多时区时间转换，确保数据库统一存储UTC时间
 */

/**
 * 生成当前UTC时间，用于数据库存储
 * @returns 当前UTC时间的Date对象
 */
export function getCurrentUTCTime(): Date {
  return new Date();
}

/**
 * 将前端输入的本地时间字符串转换为UTC时间
 * 前端输入格式: "2025-08-26T16:30" 或 "2025-08-26 16:30:00.000"
 * @param localDateTimeString 前端输入的本地时间字符串
 * @param timezone 时区，默认为 'Asia/Shanghai'
 * @returns UTC时间的Date对象
 */
export function localToUTC(localDateTimeString: string | Date, timezone: string = 'Asia/Shanghai'): Date {
  if (!localDateTimeString) {
    throw new Error('时间字符串不能为空');
  }

  try {
    // 如果已经是Date对象，直接返回
    if (localDateTimeString instanceof Date) {
      return localDateTimeString;
    }

    // 如果已经是ISO字符串格式，直接解析
    if (localDateTimeString.includes('T') && (localDateTimeString.includes('Z') || localDateTimeString.includes('+'))) {
      const date = new Date(localDateTimeString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // 标准化输入格式
    let normalizedString = localDateTimeString;
    
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
    
    // 确保是ISO格式
    if (!normalizedString.endsWith('Z')) {
      normalizedString += 'Z';
    }

    // 创建本地时间对象
    const localDate = new Date(normalizedString);
    
    if (isNaN(localDate.getTime())) {
      // 尝试其他格式
      const fallbackDate = new Date(localDateTimeString);
      if (isNaN(fallbackDate.getTime())) {
        throw new Error(`无效的时间格式: ${localDateTimeString}`);
      }
      return fallbackDate;
    }

    // 获取时区偏移量（分钟）
    const timeZoneOffset = getTimezoneOffset(timezone);
    
    // 转换为UTC时间
    const utcDate = new Date(localDate.getTime() - (timeZoneOffset * 60 * 1000));
    
    return utcDate;
  } catch (error) {
    console.error('时间转换失败:', error);
    throw new Error(`时间转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 将UTC时间转换为指定时区的本地时间字符串
 * @param utcDate UTC时间的Date对象
 * @param timezone 目标时区，默认为 'Asia/Shanghai'
 * @param format 输出格式，默认为 'full'
 * @returns 本地时间字符串
 */
export function utcToLocal(
  utcDate: Date | string, 
  timezone: string = 'Asia/Shanghai',
  format: 'full' | 'date' | 'time' | 'datetime' = 'full'
): string {
  try {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
    
    if (isNaN(date.getTime())) {
      throw new Error('无效的UTC时间');
    }

    // 使用Intl.DateTimeFormat进行时区转换
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

    const localString = formatter.format(date);
    
    // 根据格式返回不同内容
    switch (format) {
      case 'date':
        return localString.split(' ')[0];
      case 'time':
        return localString.split(' ')[1];
      case 'datetime':
        return localString;
      case 'full':
      default:
        return localString;
    }
  } catch (error) {
    console.error('UTC到本地时间转换失败:', error);
    return '时间转换失败';
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
 * 格式化时间显示（智能时区转换）
 * @param dateTimeString UTC时间字符串
 * @param userTimezone 用户时区，如果不提供则自动检测
 * @param format 输出格式
 * @returns 格式化后的本地时间字符串
 */
export function formatDateTimeSmart(
  dateTimeString: string, 
  userTimezone?: string,
  format: 'full' | 'date' | 'time' | 'datetime' = 'full'
): string {
  try {
    const timezone = userTimezone || getUserTimezone();
    return utcToLocal(dateTimeString, timezone, format);
  } catch (error) {
    console.error('智能时间格式化失败:', error);
    return formatDateTime(dateTimeString, format);
  }
}

/**
 * 将本地时间字符串转换为ISO时间字符串（不进行时区转换）
 * @param localDateTimeString 本地时间字符串 (格式: "2025-08-26T16:30")
 * @returns ISO时间字符串
 */
export function localToUTC_legacy(localDateTimeString: string): string {
  if (!localDateTimeString) return '';
  
  // 直接解析时间字符串，避免时区转换
  // 格式: "2025-08-26T16:30"
  const [datePart, timePart] = localDateTimeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  
  // 直接构造ISO字符串，不进行时区转换
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000Z`;
}

/**
 * 格式化日期时间字符串
 * @param dateTimeString 时间字符串
 * @param format 格式类型
 * @returns 格式化后的字符串
 */
export function formatDateTime(
  dateTimeString: string, 
  format: 'full' | 'date' | 'time' | 'datetime' = 'full'
): string {
  if (!dateTimeString) return '';
  
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  switch (format) {
    case 'date':
      return `${year}-${month}-${day}`;
    case 'time':
      return `${hours}:${minutes}`;
    case 'full':
    default:
      return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}

/**
 * 获取当前本地时间的datetime-local格式字符串
 * @returns 当前本地时间字符串
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
    
    const localTime = utcToLocal(now, timezone, 'full');
    
    return {
      name: timezone,
      offset: `UTC${offsetString}`,
      offsetMinutes,
      currentTime: localTime
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
