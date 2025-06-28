'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import '@uiw/react-md-editor/markdown-editor.css';

// 动态导入Markdown编辑器以避免SSR问题
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default),
  { ssr: false }
);

interface CreatePostProps {
  onPostCreated?: () => void;
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [postType, setPostType] = useState<'article' | 'question'>('article');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [bounty, setBounty] = useState(0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!title.trim() || !content.trim()) {
      setError('标题和内容不能为空');
      setLoading(false);
      return;
    }

    const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          summary: content.trim().substring(0, 200) + '...',
          tags: tagsArray,
          type: postType,
          difficulty: postType === 'question' ? difficulty : 'intermediate',
          bounty: postType === 'question' ? bounty : 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '发布失败');
      }

      // 重置表单
      setTitle('');
      setContent('');
      setTags('');
      setPostType('article');
      setDifficulty('intermediate');
      setBounty(0);
      setIsOpen(false);
      
      if (onPostCreated) {
        onPostCreated();
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
  };

  if (!isOpen) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => {
            setPostType('article');
            setIsOpen(true);
          }}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span>写文章</span>
          </div>
        </button>
        
        <button
          onClick={() => {
            setPostType('question');
            setIsOpen(true);
          }}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>提问题</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {postType === 'article' ? '发布新文章' : '提出问题'}
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                postType === 'article' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {postType === 'article' ? '文章' : '问题'}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
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

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="flex-shrink-0 px-6 pt-6 space-y-4">
              {/* 类型切换 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  内容类型
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setPostType('article')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      postType === 'article'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📝 文章
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType('question')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      postType === 'question'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ❓ 问题
                  </button>
                </div>
              </div>

              {/* 标题输入 */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  {postType === 'article' ? '文章标题' : '问题标题'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg"
                  placeholder={postType === 'article' ? '请输入文章标题' : '请用一句话清楚地描述你的问题'}
                />
              </div>

              {/* 标签输入 */}
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                  标签
                </label>
                <input
                  type="text"
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="请输入标签，用逗号分隔（如：技术,编程,前端）"
                />
                {tags && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.split(',').map((tag, index) => {
                      const trimmedTag = tag.trim();
                      return trimmedTag ? (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          #{trimmedTag}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* 问题特有设置 */}
              {postType === 'question' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      难度等级
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="beginner">🟢 新手级</option>
                      <option value="intermediate">🟡 中级</option>
                      <option value="advanced">🔴 高级</option>
                    </select>
                  </div>
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Markdown编辑器 */}
            <div className="flex-1 px-6 pb-6 flex flex-col min-h-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {postType === 'article' ? '文章内容' : '问题详情'} <span className="text-red-500">*</span>
              </label>
              <div className="flex-1 border border-gray-300 rounded-xl overflow-hidden min-h-0">
                <div className="h-full" data-color-mode="light">
                  {typeof window !== 'undefined' && (
                    <MDEditor
                      value={content}
                      onChange={(val) => setContent(val || '')}
                      preview="edit"
                      hideToolbar={false}
                      visibleDragbar={false}
                      height="100%"
                      textareaProps={{
                        placeholder: postType === 'article' 
                          ? '请输入文章内容，支持Markdown语法...\n\n示例：\n# 标题\n## 二级标题\n**粗体文字**\n*斜体文字*\n\n- 列表项1\n- 列表项2\n\n```javascript\n// 代码块\nconsole.log("Hello World");\n```\n\n> 引用文字\n\n[链接文字](https://example.com)'
                          : '请详细描述你的问题，包括：\n\n1. 问题的具体表现\n2. 你期望的结果\n3. 你已经尝试的解决方法\n4. 相关的代码片段（如果适用）\n5. 错误信息（如果有）\n\n支持Markdown语法，可以使用代码块、列表、链接等格式。',
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
              <div className="mt-2 text-sm text-gray-500">
                <span>💡 支持Markdown语法，可使用工具栏快速插入格式</span>
              </div>
            </div>
          </form>
        </div>

        {/* 底部按钮 */}
        <div className="flex-shrink-0 p-6 border-t border-gray-200">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium"
            >
              取消
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                const form = document.querySelector('form') as HTMLFormElement;
                if (form) {
                  form.requestSubmit();
                }
              }}
              disabled={loading || !title.trim() || !content.trim()}
              className={`flex-1 font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                postType === 'article'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>发布中...</span>
                </div>
              ) : (
                postType === 'article' ? '发布文章' : '发布问题'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 