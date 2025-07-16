'use client';

import { useEffect } from 'react';

export default function SchedulerInitializer() {
  useEffect(() => {
    // 在客户端启动时初始化调度器
    const initScheduler = async () => {
      try {
        // 只在管理员页面初始化调度器
        if (window.location.pathname.startsWith('/admin')) {
          const response = await fetch('/api/admin/scheduler/init', {
            method: 'POST',
          });
          
          if (response.ok) {
            console.log('✅ 定时任务调度器已初始化');
          }
        }
      } catch (error) {
        console.error('❌ 初始化定时任务调度器失败:', error);
      }
    };

    initScheduler();
  }, []);

  return null; // 这个组件不渲染任何内容
} 