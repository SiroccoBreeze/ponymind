'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import '@uiw/react-md-editor/markdown-editor.css';

// 动态导入Markdown编辑器以避免SSR问题
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default),
  { ssr: false }
);

interface Tag {
  _id: string;
  name: string;
  color: string;
  description: string;
  usageCount: number;
}

export default function AskPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // 表单字段
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [bounty, setBounty] = useState(0);
  
  // 标签相关
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  
  // 获取可用标签
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/admin/tags');
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(data.tags || []);
        }
      } catch (error) {
        console.error('获取标签失败:', error);
      }
    };
    
    fetchTags();
  }, []);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/ask');
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!title.trim()) {
      setError('请输入问题标题');
      setLoading(false);
      return;
    }

    if (!content.trim()) {
      setError('请详细描述你的问题');
      setLoading(false);
      return;
    }

    if (tags.length === 0) {
      setError('请至少选择一个标签');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          summary: content.trim().substring(0, 200) + '...',
          tags,
          type: 'question',
          difficulty,
          bounty,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '提交问题失败');
      }

      const result = await response.json();
      setSuccess(true);
      
      // 3秒后跳转到问题详情页
      setTimeout(() => {
        router.push(`/posts/${result._id}`);
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : '提交问题失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const addTag = (tagName: string) => {
    if (!tags.includes(tagName) && tags.length < 5) {
      setTags([...tags, tagName]);
      setTagInput('');
      setShowTagSuggestions(false);
    }
  };

  const removeTag = (tagName: string) => {
    setTags(tags.filter(tag => tag !== tagName));
  };

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    setShowTagSuggestions(value.length > 0);
  };

  const filteredTags = availableTags.filter(tag => 
    tag.name.toLowerCase().includes(tagInput.toLowerCase()) && 
    !tags.includes(tag.name)
  );

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">请先登录</h1>
          <p className="text-gray-600 mb-6">你需要登录后才能提问</p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">问题提交成功！</h1>
          <p className="text-gray-600 mb-6">
            你的问题已经发布，社区成员会尽快为你解答。
          </p>
          <p className="text-sm text-gray-500">
            3秒后自动跳转到问题详情页...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">提出问题</h1>
          <p className="text-lg text-gray-600">
            详细描述你遇到的问题，社区专家会为你提供专业解答
          </p>
        </div>

        {/* 提问指南 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">💡 提问指南</h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• 使用清晰、具体的标题描述问题</li>
            <li>• 详细说明问题的背景和你已经尝试的解决方法</li>
            <li>• 如果是代码问题，请提供相关代码片段</li>
            <li>• 选择合适的标签，帮助专家快速理解问题领域</li>
            <li>• 设置合理的难度等级和悬赏积分</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-8 space-y-6">
          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 问题标题 */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              问题标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg"
              placeholder="请用一句话清楚地描述你的问题"
              maxLength={200}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              {title.length}/200 字符
            </p>
          </div>

          {/* 问题详情 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              问题详情 <span className="text-red-500">*</span>
            </label>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div data-color-mode="light">
                {typeof window !== 'undefined' && (
                  <MDEditor
                    value={content}
                    onChange={(val) => setContent(val || '')}
                    preview="edit"
                    hideToolbar={false}
                    visibleDragbar={false}
                    height={400}
                    textareaProps={{
                      placeholder: `请详细描述你的问题，包括：

1. 问题的具体表现
2. 你期望的结果
3. 你已经尝试的解决方法
4. 相关的代码片段（如果适用）
5. 错误信息（如果有）

支持Markdown语法，可以使用代码块、列表、链接等格式。`,
                      style: {
                        fontSize: 14,
                        lineHeight: 1.6,
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        resize: 'none',
                      }
                    }}
                  />
                )}
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              💡 详细的问题描述有助于获得更准确的答案
            </p>
          </div>

          {/* 标签选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              相关标签 <span className="text-red-500">*</span>
            </label>
            
            {/* 已选标签 */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* 标签输入 */}
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="输入标签名称或从建议中选择"
                disabled={tags.length >= 5}
              />
              
              {/* 标签建议 */}
              {showTagSuggestions && filteredTags.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredTags.slice(0, 10).map((tag) => (
                    <button
                      key={tag._id}
                      type="button"
                      onClick={() => addTag(tag.name)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900">{tag.name}</span>
                          {tag.description && (
                            <p className="text-sm text-gray-500 mt-1">{tag.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {tag.usageCount} 次使用
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <p className="mt-2 text-sm text-gray-500">
              最多选择5个标签，已选择 {tags.length}/5
            </p>
          </div>

          {/* 问题设置 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 难度等级 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                难度等级
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="beginner">🟢 新手级 - 基础问题</option>
                <option value="intermediate">🟡 中级 - 需要一定经验</option>
                <option value="advanced">🔴 高级 - 复杂技术问题</option>
              </select>
            </div>

            {/* 悬赏积分 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                悬赏积分
              </label>
              <input
                type="number"
                value={bounty}
                onChange={(e) => setBounty(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
                max="1000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="0"
              />
              <p className="mt-1 text-sm text-gray-500">
                设置悬赏可以吸引更多专家回答（可选）
              </p>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim() || tags.length === 0}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>提交中...</span>
                </div>
              ) : (
                '发布问题'
              )}
            </button>
          </div>
        </form>

        {/* 相关帮助 */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">需要帮助？</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/faq"
              className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="text-2xl">❓</div>
              <div>
                <h4 className="font-medium text-gray-900">查看FAQ</h4>
                <p className="text-sm text-gray-500">常见问题解答</p>
              </div>
            </Link>
            
            <Link
              href="/ai"
              className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="text-2xl">🤖</div>
              <div>
                <h4 className="font-medium text-gray-900">AI助手</h4>
                <p className="text-sm text-gray-500">智能问答</p>
              </div>
            </Link>
            
            <Link
              href="/posts"
              className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="text-2xl">📚</div>
              <div>
                <h4 className="font-medium text-gray-900">浏览问题</h4>
                <p className="text-sm text-gray-500">查看其他问题</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 