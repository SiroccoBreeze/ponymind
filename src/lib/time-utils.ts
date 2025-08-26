/**
 * 时间处理工具函数
 * 直接处理用户输入的时间，不进行时区转换
 */

/**
 * 将本地时间字符串转换为ISO时间字符串（不进行时区转换）
 * @param localDateTimeString 本地时间字符串 (格式: "2025-08-26T16:30")
 * @returns ISO时间字符串
 */
export function localToUTC(localDateTimeString: string): string {
  if (!localDateTimeString) return '';
  
  // 直接解析时间字符串，避免时区转换
  // 格式: "2025-08-26T16:30"
  const [datePart, timePart] = localDateTimeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  
  // 直接构造ISO字符串，不进行时区转换
  const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
  
  return isoString;
}

/**
 * 将ISO时间字符串转换为本地时间字符串（用于编辑表单）
 * @param isoDateTimeString ISO时间字符串
 * @returns 本地时间字符串 (格式: "2025-08-26T16:30")
 */
export function utcToLocal(isoDateTimeString: string): string {
  if (!isoDateTimeString) return '';
  
  // 创建Date对象
  const date = new Date(isoDateTimeString);
  
  // 格式化为 datetime-local 输入框需要的格式
  return date.toISOString().slice(0, 16);
}

/**
 * 格式化时间为可读字符串
 * @param dateTimeString 时间字符串
 * @param format 格式类型: 'full' | 'date' | 'time'
 * @returns 格式化后的时间字符串
 */
export function formatDateTime(
  dateTimeString: string, 
  format: 'full' | 'date' | 'time' = 'full'
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
export function getCurrentLocalDateTime(): string {
  const now = new Date();
  return now.toISOString().slice(0, 16);
}
