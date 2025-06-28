'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AIPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const aiFeatures = [
    {
      id: 'chat',
      title: 'AI 智能对话',
      description: '与先进的AI助手进行自然语言对话，获得专业建议和解答',
      icon: '💬',
      category: 'chat',
      status: '即将推出',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'writing',
      title: 'AI 写作助手',
      description: '智能文章生成、内容优化、语法检查和写作建议',
      icon: '✍️',
      category: 'writing',
      status: '开发中',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'code',
      title: 'AI 代码助手',
      description: '代码生成、调试、优化和技术问题解答',
      icon: '💻',
      category: 'coding',
      status: '即将推出',
      color: 'from-green-500 to-teal-500'
    },
    {
      id: 'analysis',
      title: 'AI 数据分析',
      description: '智能数据分析、图表生成和洞察发现',
      icon: '📊',
      category: 'analysis',
      status: '规划中',
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 'translate',
      title: 'AI 翻译',
      description: '多语言智能翻译，支持上下文理解',
      icon: '🌐',
      category: 'language',
      status: '即将推出',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      id: 'summary',
      title: 'AI 内容摘要',
      description: '智能提取文章要点，生成精准摘要',
      icon: '📝',
      category: 'writing',
      status: '开发中',
      color: 'from-pink-500 to-rose-500'
    }
  ];

  const categories = [
    { id: 'all', name: '全部', icon: '🌟' },
    { id: 'chat', name: '对话', icon: '💬' },
    { id: 'writing', name: '写作', icon: '✍️' },
    { id: 'coding', name: '编程', icon: '💻' },
    { id: 'analysis', name: '分析', icon: '📊' },
    { id: 'language', name: '语言', icon: '🌐' }
  ];

  const filteredFeatures = selectedCategory === 'all' 
    ? aiFeatures 
    : aiFeatures.filter(feature => feature.category === selectedCategory);

  const getStatusColor = (status: string) => {
    switch (status) {
      case '即将推出':
        return 'bg-blue-100 text-blue-800';
      case '开发中':
        return 'bg-yellow-100 text-yellow-800';
      case '规划中':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* 头部横幅 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <span className="text-4xl">🤖</span>
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              AI 智能助手
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              体验下一代人工智能技术，让AI成为您的得力助手，提升工作效率，激发创造力
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl">
                开始体验
              </button>
              <Link 
                href="/services"
                className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:text-gray-900 transition-all duration-200"
              >
                了解更多
              </Link>
            </div>
          </div>
        </div>
        
        {/* 装饰性元素 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
          <div className="absolute top-20 right-20 w-16 h-16 bg-white/10 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full animate-pulse delay-500"></div>
          <div className="absolute bottom-10 right-10 w-12 h-12 bg-white/10 rounded-full animate-pulse delay-700"></div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* 分类筛选 */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <span className="text-lg">{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {/* AI功能卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredFeatures.map((feature) => (
            <div
              key={feature.id}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
            >
              <div className={`h-2 bg-gradient-to-r ${feature.color}`}></div>
              
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl">{feature.icon}</div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(feature.status)}`}>
                    {feature.status}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-200">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {feature.description}
                </p>
                
                <button className="w-full px-6 py-3 bg-gray-50 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-all duration-200 group-hover:bg-blue-50 group-hover:text-blue-700">
                  {feature.status === '即将推出' ? '敬请期待' : '了解详情'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 统计信息 */}
        <div className="mt-20 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">AI 能力概览</h2>
            <p className="text-gray-600">持续进化的人工智能技术</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧠</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">6+</div>
              <div className="text-sm text-gray-600">AI 功能模块</div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">99.9%</div>
              <div className="text-sm text-gray-600">服务可用性</div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">&lt;1s</div>
              <div className="text-sm text-gray-600">平均响应时间</div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">100%</div>
              <div className="text-sm text-gray-600">数据安全保护</div>
            </div>
          </div>
        </div>

        {/* CTA 区域 */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">准备好体验AI的力量了吗？</h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              加入我们，探索人工智能的无限可能，让技术为您的创造力插上翅膀
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 shadow-lg">
                立即开始
              </button>
              <Link 
                href="/auth/register"
                className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:text-gray-900 transition-all duration-200"
              >
                免费注册
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 