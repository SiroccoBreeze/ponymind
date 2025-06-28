'use client';

import { useState, useEffect } from 'react';

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  siteKeywords: string;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  maxPostsPerDay: number;
  maxTagsPerPost: number;
  autoCloseQuestions: boolean;
  autoCloseAfterDays: number;
  enableNotifications: boolean;
  enableEmailNotifications: boolean;
  moderationMode: 'auto' | 'manual' | 'disabled';
  spamFilterEnabled: boolean;
  maintenanceMode: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
  enableComments: boolean;
  enableLikes: boolean;
  enableViews: boolean;
}

interface SystemInfo {
  version: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
  };
  cpuUsage: number[];
  totalMemory: number;
  freeMemory: number;
  timestamp: string;
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: 'PonyMind',
    siteDescription: '技术问答与知识分享的专业平台',
    siteKeywords: '技术,问答,知识分享,编程,开发',
    allowRegistration: true,
    requireEmailVerification: false,
    maxPostsPerDay: 10,
    maxTagsPerPost: 5,
    autoCloseQuestions: false,
    autoCloseAfterDays: 30,
    enableNotifications: true,
    enableEmailNotifications: true,
    moderationMode: 'auto',
    spamFilterEnabled: true,
    maintenanceMode: false,
    maxFileSize: 5,
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    enableComments: true,
    enableLikes: true,
    enableViews: true,
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    // 加载设置和系统信息
    const loadData = async () => {
      try {
        const [settingsResponse, systemInfoResponse] = await Promise.all([
          fetch('/api/admin/settings'),
          fetch('/api/admin/system-info')
        ]);

        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setSettings(settingsData.settings);
        }

        if (systemInfoResponse.ok) {
          const systemInfoData = await systemInfoResponse.json();
          setSystemInfo(systemInfoData.systemInfo);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert('保存失败');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: keyof SystemSettings, value: string | number | boolean | string[]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleArrayChange = (key: keyof SystemSettings, value: string) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    setSettings(prev => ({
      ...prev,
      [key]: array
    }));
  };

  const tabs = [
    { id: 'basic', label: '基本设置', icon: '⚙️' },
    { id: 'user', label: '用户设置', icon: '👥' },
    { id: 'content', label: '内容设置', icon: '📝' },
    { id: 'notification', label: '通知设置', icon: '🔔' },
    { id: 'security', label: '安全设置', icon: '🔒' },
    { id: 'system', label: '系统设置', icon: '💻' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载设置...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">系统设置</h1>
          <p className="text-gray-600 mt-2">配置系统的基本参数和功能选项</p>
        </div>
        <div className="flex space-x-3">
          {saved && (
            <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg flex items-center">
              <span className="mr-2">✓</span>
              设置已保存
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : (
              '保存设置'
            )}
          </button>
        </div>
      </div>

      {/* 选项卡导航 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* 基本设置 */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    站点名称
                  </label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => handleInputChange('siteName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    站点关键词
                  </label>
                  <input
                    type="text"
                    value={settings.siteKeywords}
                    onChange={(e) => handleInputChange('siteKeywords', e.target.value)}
                    placeholder="用逗号分隔多个关键词"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  站点描述
                </label>
                <textarea
                  value={settings.siteDescription}
                  onChange={(e) => handleInputChange('siteDescription', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* 用户设置 */}
          {activeTab === 'user' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">允许用户注册</h3>
                    <p className="text-sm text-gray-500">是否允许新用户自主注册账号</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allowRegistration}
                      onChange={(e) => handleInputChange('allowRegistration', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">邮箱验证</h3>
                    <p className="text-sm text-gray-500">注册时是否需要邮箱验证</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.requireEmailVerification}
                      onChange={(e) => handleInputChange('requireEmailVerification', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 内容设置 */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    每日最大发布数
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.maxPostsPerDay}
                    onChange={(e) => handleInputChange('maxPostsPerDay', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">单个用户每天最多可发布的内容数量</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    每篇内容最大标签数
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.maxTagsPerPost}
                    onChange={(e) => handleInputChange('maxTagsPerPost', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">每篇内容最多可添加的标签数量</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">启用评论功能</h3>
                    <p className="text-sm text-gray-500">是否允许用户对内容进行评论</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableComments}
                      onChange={(e) => handleInputChange('enableComments', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">启用点赞功能</h3>
                    <p className="text-sm text-gray-500">是否允许用户对内容进行点赞</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableLikes}
                      onChange={(e) => handleInputChange('enableLikes', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">启用浏览统计</h3>
                    <p className="text-sm text-gray-500">是否统计和显示内容浏览次数</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableViews}
                      onChange={(e) => handleInputChange('enableViews', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">自动关闭问题</h3>
                    <p className="text-sm text-gray-500">长时间无回答的问题是否自动关闭</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoCloseQuestions}
                      onChange={(e) => handleInputChange('autoCloseQuestions', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settings.autoCloseQuestions && (
                  <div className="ml-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      自动关闭天数
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.autoCloseAfterDays}
                      onChange={(e) => handleInputChange('autoCloseAfterDays', parseInt(e.target.value))}
                      className="w-full md:w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">问题发布后多少天无回答则自动关闭</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 通知设置 */}
          {activeTab === 'notification' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">启用站内通知</h3>
                    <p className="text-sm text-gray-500">是否启用站内消息通知功能</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableNotifications}
                      onChange={(e) => handleInputChange('enableNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">启用邮件通知</h3>
                    <p className="text-sm text-gray-500">是否发送邮件通知给用户</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableEmailNotifications}
                      onChange={(e) => handleInputChange('enableEmailNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 安全设置 */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  内容审核模式
                </label>
                <select
                  value={settings.moderationMode}
                  onChange={(e) => handleInputChange('moderationMode', e.target.value as 'auto' | 'manual' | 'disabled')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="auto">自动审核</option>
                  <option value="manual">人工审核</option>
                  <option value="disabled">关闭审核</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">选择内容发布前的审核方式</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">启用垃圾内容过滤</h3>
                    <p className="text-sm text-gray-500">自动检测和过滤垃圾内容</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.spamFilterEnabled}
                      onChange={(e) => handleInputChange('spamFilterEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最大文件大小 (MB)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.maxFileSize}
                    onChange={(e) => handleInputChange('maxFileSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    允许的文件类型
                  </label>
                  <input
                    type="text"
                    value={settings.allowedFileTypes.join(', ')}
                    onChange={(e) => handleArrayChange('allowedFileTypes', e.target.value)}
                    placeholder="jpg, png, pdf, doc"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">用逗号分隔多个文件类型</p>
                </div>
              </div>
            </div>
          )}

          {/* 系统设置 */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-red-800">维护模式</h3>
                    <p className="text-sm text-red-600">启用后，只有管理员可以访问网站</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.maintenanceMode}
                      onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">系统信息</h3>
                {systemInfo ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">系统版本:</span>
                      <span className="ml-2 font-medium">{systemInfo.version}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Node.js 版本:</span>
                      <span className="ml-2 font-medium">{systemInfo.nodeVersion}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">运行时间:</span>
                      <span className="ml-2 font-medium">{systemInfo.uptime} 小时</span>
                    </div>
                    <div>
                      <span className="text-gray-600">内存使用:</span>
                      <span className="ml-2 font-medium">
                        {systemInfo.memoryUsage.used}MB / {systemInfo.memoryUsage.total}MB
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">系统平台:</span>
                      <span className="ml-2 font-medium">{systemInfo.platform} ({systemInfo.arch})</span>
                    </div>
                    <div>
                      <span className="text-gray-600">系统内存:</span>
                      <span className="ml-2 font-medium">
                        {systemInfo.freeMemory}GB / {systemInfo.totalMemory}GB 可用
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">正在加载系统信息...</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 