'use client';

import Link from 'next/link';

export default function ServicesPage() {

  const services = [
    {
      id: 'knowledge',
      title: '知识管理',
      description: '专业的知识库管理系统，帮助您整理、分享和发现有价值的内容',
      icon: '📚',
      features: ['文章发布与管理', '智能分类标签', '全文搜索', '内容推荐'],
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'community',
      title: '社区互动',
      description: '活跃的知识分享社区，与志同道合的人交流学习',
      icon: '👥',
      features: ['用户互动', '评论讨论', '关注收藏', '社区活动'],
      color: 'from-green-500 to-teal-500'
    },
    {
      id: 'ai-powered',
      title: 'AI 增强',
      description: '集成先进AI技术，提供智能化的内容创作和分析服务',
      icon: '🤖',
      features: ['AI 写作助手', '内容优化', '智能摘要', '自动标签'],
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'analytics',
      title: '数据分析',
      description: '深入的数据洞察，帮您了解内容表现和用户行为',
      icon: '📊',
      features: ['访问统计', '用户分析', '内容洞察', '趋势报告'],
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 'collaboration',
      title: '团队协作',
      description: '强大的团队协作功能，支持多人共同创作和管理',
      icon: '🤝',
      features: ['团队空间', '协作编辑', '权限管理', '工作流程'],
      color: 'from-indigo-500 to-purple-500'
    },
    {
      id: 'integration',
      title: '系统集成',
      description: '丰富的API接口和第三方集成，无缝连接您的工作流',
      icon: '🔗',
      features: ['开放API', '第三方集成', '数据同步', '自定义开发'],
      color: 'from-pink-500 to-rose-500'
    }
  ];

  const pricingPlans = [
    {
      id: 'free',
      name: '免费版',
      price: '0',
      period: '永久免费',
      description: '适合个人用户开始使用',
      features: [
        '5篇文章发布',
        '基础搜索功能',
        '社区互动',
        '标准客服支持'
      ],
      limitations: [
        '存储空间 100MB',
        '月访问量 1000次'
      ],
      buttonText: '开始使用',
      popular: false
    },
    {
      id: 'pro',
      name: '专业版',
      price: '29',
      period: '每月',
      description: '适合专业用户和小团队',
      features: [
        '无限文章发布',
        '高级搜索与筛选',
        'AI 写作助手',
        '数据分析报告',
        '优先客服支持',
        '自定义主题'
      ],
      limitations: [
        '存储空间 10GB',
        '月访问量 50,000次'
      ],
      buttonText: '立即订阅',
      popular: true
    },
    {
      id: 'enterprise',
      name: '企业版',
      price: '99',
      period: '每月',
      description: '适合大型团队和企业',
      features: [
        '专业版所有功能',
        '团队协作空间',
        '高级AI功能',
        '自定义集成',
        '专属客户经理',
        'SLA保障',
        '数据备份与恢复'
      ],
      limitations: [
        '存储空间 100GB',
        '无限访问量'
      ],
      buttonText: '联系销售',
      popular: false
    }
  ];

  const testimonials = [
    {
      name: '张小明',
      role: '产品经理',
      company: '科技公司',
      content: 'PonyMind帮助我们团队更好地管理和分享知识，AI功能特别实用。',
      avatar: '👨‍💼'
    },
    {
      name: '李小红',
      role: '内容创作者',
      company: '自媒体',
      content: '平台的写作助手让我的创作效率提升了50%，推荐给所有创作者。',
      avatar: '👩‍💻'
    },
    {
      name: '王小刚',
      role: '技术总监',
      company: '互联网公司',
      content: '开放的API和良好的集成能力，让我们能够无缝对接现有系统。',
      avatar: '👨‍💻'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* 头部横幅 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-blue-600 to-purple-600">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <span className="text-4xl">⚙️</span>
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              专业服务
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              为您提供全方位的知识管理解决方案，从个人到企业，满足不同规模的需求
            </p>
          </div>
        </div>
      </div>

      {/* 服务特性 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">核心服务</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            我们提供完整的知识管理生态系统，涵盖内容创作、社区互动、AI增强等多个维度
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 group"
            >
              <div className={`h-2 bg-gradient-to-r ${service.color}`}></div>
              
              <div className="p-8">
                <div className="text-4xl mb-4">{service.icon}</div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-200">
                  {service.title}
                </h3>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {service.description}
                </p>
                
                <ul className="space-y-2">
                  {service.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-700">
                      <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 价格方案 */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">选择适合您的方案</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              从免费开始，随着需求增长升级到更高级的方案
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-8 ${
                  plan.popular
                    ? 'border-blue-500 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-gray-300'
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      最受欢迎
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">¥{plan.price}</span>
                    <span className="text-gray-600 ml-2">{plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="border-t border-gray-200 pt-6 mb-8">
                  <p className="text-sm text-gray-600 mb-2">限制条件：</p>
                  <ul className="space-y-1">
                    {plan.limitations.map((limitation, index) => (
                      <li key={index} className="text-sm text-gray-500">
                        • {limitation}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 用户评价 */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">用户评价</h2>
            <p className="text-xl text-gray-600">
              听听我们用户的真实反馈
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-2xl">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role} · {testimonial.company}</p>
                  </div>
                </div>
                
                <p className="text-gray-700 leading-relaxed">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
                
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA 区域 */}
      <div className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">准备开始您的知识管理之旅？</h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              加入数千名用户，体验高效的知识管理和AI增强的内容创作
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/auth/register"
                className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 shadow-lg"
              >
                免费开始
              </Link>
              <button className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:text-gray-900 transition-all duration-200">
                预约演示
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 