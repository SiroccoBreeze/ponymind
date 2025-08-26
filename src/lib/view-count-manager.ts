// 浏览量管理工具，防止重复计数
class ViewCountManager {
  private viewCache: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1小时

  /**
   * 检查是否可以增加浏览量
   * @param postId 文章ID
   * @param userIP 用户IP地址
   * @returns 是否可以增加浏览量
   */
  canIncrementView(postId: string, userIP: string): boolean {
    const cacheKey = `post_view_${postId}_${userIP}`;
    const now = Date.now();
    const lastViewTime = this.viewCache.get(cacheKey);

    if (!lastViewTime || (now - lastViewTime) > this.CACHE_DURATION) {
      // 更新缓存时间
      this.viewCache.set(cacheKey, now);
      return true;
    }

    return false;
  }

  /**
   * 清理过期的缓存
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.viewCache.entries()) {
      if (now - timestamp > this.CACHE_DURATION) {
        this.viewCache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.viewCache.size,
      keys: Array.from(this.viewCache.keys())
    };
  }
}

// 创建全局实例
export const viewCountManager = new ViewCountManager();

// 定期清理过期缓存（每小时执行一次）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    viewCountManager.cleanupExpiredCache();
  }, 60 * 60 * 1000); // 1小时
}
