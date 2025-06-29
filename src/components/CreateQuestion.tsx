'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// 动态导入MarkdownEditor以避免SSR问题
const MarkdownEditor = dynamic(
  () => import('./MarkdownEditor'),
  { ssr: false }
);

interface CreateQuestionProps {
  onQuestionCreated?: () => void;
  editQuestionId?: string;
  onClose?: () => void;
}

interface Tag {
  _id: string;
  name: string;
  description: string;
  color: string;
  usageCount: number;
}

export default function CreateQuestion({ onQuestionCreated, editQuestionId, onClose }: CreateQuestionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 基本信息
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [originalQuestion, setOriginalQuestion] = useState<any>(null);
  const [useSimpleEditor, setUseSimpleEditor] = useState(false);
  
  // 标签相关状态
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);

  // 获取可用标签
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags');
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

  // 编辑模式：获取问题数据
  useEffect(() => {
    const fetchQuestionData = async () => {
      if (!editQuestionId) return;
      
      try {
        const response = await fetch(`/api/posts/${editQuestionId}`);
        if (response.ok) {
          const question = await response.json();
          setOriginalQuestion(question);
          setTitle(question.title);
          setContent(question.content);
          setSelectedTags(question.tags || []);
          
          console.log('编辑模式已加载问题内容:', {
            title: question.title,
            contentLength: question.content?.length || 0,
            tags: question.tags,
            type: question.type
          });
        }
      } catch (error) {
        console.error('获取问题数据失败:', error);
        setError('获取问题数据失败');
      }
    };
    
    if (editQuestionId) {
      fetchQuestionData();
    }
  }, [editQuestionId]);

  // 阻止页面滚动
  useEffect(() => {
    // 保存当前滚动位置
    const scrollY = window.scrollY;
    // 阻止页面滚动
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    return () => {
      // 恢复页面滚动
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    if (!title.trim() || !content.trim()) {
      setError('标题和内容不能为空');
      setLoading(false);
      return;
    }

    try {
      const url = editQuestionId ? `/api/posts/${editQuestionId}` : '/api/posts';
      const method = editQuestionId ? 'PUT' : 'POST';
      
      const body = {
        title: title.trim(),
        content: content.trim(),
        summary: content.trim().substring(0, 200) + '...',
        tags: selectedTags,
        type: 'question',
        questionDetails: {
          solution: '',
          expectation: '',
          actual: '',
          system: '',
          menu: '',
          version: '',
          operation: ''
        },
        reviewStatus: editQuestionId && originalQuestion?.reviewStatus === 'published' ? 'published' : 'pending'
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || (editQuestionId ? '更新失败' : '发布失败'));
      }

      // 重置表单并关闭
      resetForm();
      
      if (onQuestionCreated) {
        onQuestionCreated();
      }
      router.refresh();
      
      alert(editQuestionId ? '问题更新成功！' : '问题已发布成功！');
    } catch (err) {
      setError(err instanceof Error ? err.message : (editQuestionId ? '更新失败，请稍后重试' : '发布失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setError('请至少输入标题');
      return;
    }

    setError(null);
    setSavingDraft(true);

    try {
      const url = editQuestionId ? `/api/posts/${editQuestionId}` : '/api/posts';
      const method = editQuestionId ? 'PUT' : 'POST';
      
      const body = {
        title: title.trim(),
        content: content.trim(),
        summary: content.trim().substring(0, 200) + '...',
        tags: selectedTags,
        type: 'question',
        questionDetails: {
          solution: '',
          expectation: '',
          actual: '',
          system: '',
          menu: '',
          version: '',
          operation: ''
        },
        reviewStatus: 'draft'
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存失败');
      }

      resetForm();
      
      if (onQuestionCreated) {
        onQuestionCreated();
      }
      
      alert('草稿保存成功！可在用户中心查看和继续编辑');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请稍后重试');
    } finally {
      setSavingDraft(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSelectedTags([]);
    setOriginalQuestion(null);
    setUseSimpleEditor(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    if (onClose) {
      onClose();
    } else {
      router.push('/');
    }
  };

  const addTag = (tagName: string) => {
    if (!selectedTags.includes(tagName) && selectedTags.length < 5) {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const removeTag = (tagName: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagName));
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-900">
            {editQuestionId ? '编辑问题' : '提出问题'}
          </h1>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
              ❓ 问题
            </span>
            {content.length > 0 && (
              <span className="text-xs text-gray-500">
                {content.length} 字符
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* 编辑器模式切换 */}
          <button
            type="button"
            onClick={() => setUseSimpleEditor(!useSimpleEditor)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              useSimpleEditor 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {useSimpleEditor ? '📝 简单模式' : '🎨 富文本模式'}
          </button>

          {/* 保存草稿 */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || !title.trim()}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingDraft && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span>{savingDraft ? '保存中...' : '保存草稿'}</span>
          </button>
          
          {/* 发布按钮 */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || savingDraft || !title.trim() || !content.trim()}
            className="flex items-center space-x-2 font-medium py-2 px-6 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>发布中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>发布问题</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧设置面板 */}
        <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* 标题输入 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                问题标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="简要描述你遇到的问题..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                required
              />
            </div>

            {/* 标签选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                相关标签 (最多5个)
              </label>
              
              {/* 已选择的标签 */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700 border border-orange-200"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-orange-500 hover:text-orange-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* 搜索框 */}
              {selectedTags.length < 5 && (
                <div className="mb-3">
                  <input
                    type="text"
                    value={tagSearchTerm}
                    onChange={(e) => setTagSearchTerm(e.target.value)}
                    placeholder="搜索标签..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  />
                </div>
              )}

              {/* 热门标签 */}
              {selectedTags.length < 5 && !tagSearchTerm && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">热门标签</span>
                    <button
                      type="button"
                      onClick={() => setShowAllTags(!showAllTags)}
                      className="text-xs text-orange-600 hover:text-orange-800"
                    >
                      {showAllTags ? '收起' : '显示全部'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const filteredTags = availableTags.filter(tag => !selectedTags.includes(tag.name));
                      const tagsToShow = showAllTags ? filteredTags : filteredTags.slice(0, 12);
                      
                      return tagsToShow.map((tag) => (
                        <button
                          key={tag._id}
                          type="button"
                          onClick={() => addTag(tag.name)}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-700 transition-colors border border-gray-200 hover:border-orange-200"
                        >
                          #{tag.name}
                          <span className="ml-1 text-gray-400 text-xs">({tag.usageCount})</span>
                        </button>
                      ));
                    })()}
                  </div>
                  {!showAllTags && availableTags.length > 12 && (
                    <div className="text-center mt-2">
                      <span className="text-xs text-gray-500">
                        还有 {availableTags.length - 12} 个标签
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 搜索结果 */}
              {tagSearchTerm && (
                <div className="border border-gray-200 rounded-lg bg-white shadow-sm max-h-40 overflow-y-auto">
                  {(() => {
                    const filteredTags = availableTags.filter(tag => 
                      tag.name.toLowerCase().includes(tagSearchTerm.toLowerCase()) &&
                      !selectedTags.includes(tag.name)
                    );

                    if (filteredTags.length === 0) {
                      return (
                        <div className="p-3 text-sm text-gray-500 text-center">
                          未找到匹配的标签
                          {tagSearchTerm.trim() && (
                            <div className="mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (tagSearchTerm.trim() && !selectedTags.includes(tagSearchTerm.trim())) {
                                    addTag(tagSearchTerm.trim());
                                    setTagSearchTerm('');
                                  }
                                }}
                                className="text-orange-600 hover:text-orange-800 underline"
                              >
                                创建新标签 "#{tagSearchTerm.trim()}"
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return filteredTags.map((tag) => (
                      <button
                        key={tag._id}
                        type="button"
                        onClick={() => {
                          addTag(tag.name);
                          setTagSearchTerm('');
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">#{tag.name}</span>
                          <span className="text-xs text-gray-500">使用 {tag.usageCount} 次</span>
                        </div>
                        {tag.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {tag.description}
                          </div>
                        )}
                      </button>
                    ));
                  })()}
                </div>
              )}

              <div className="text-xs text-gray-500 mt-2">
                已选择 {selectedTags.length}/5 个标签
                {selectedTags.length < 5 && (
                  <span> • 点击上方标签快速添加，或搜索查找更多标签</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧编辑器区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* 问题详情编辑器 */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  问题详情 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <span>支持Markdown语法</span>
                  {!useSimpleEditor && (
                    <span>• 右侧可查看目录大纲</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 min-h-0 bg-white">
              {useSimpleEditor ? (
                // 简单文本编辑器
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="详细描述你遇到的问题...\n\n建议包含：\n• 问题的具体表现\n• 重现步骤\n• 相关代码片段\n• 错误信息\n• 你尝试过的解决方法\n\n例如：\n## 问题描述\n当我点击提交按钮时，页面没有响应\n\n## 重现步骤\n1. 打开登录页面\n2. 输入用户名和密码\n3. 点击提交按钮\n\n## 相关代码\n```javascript\nconst handleSubmit = () => {\n  // 代码片段\n};\n```"
                  className="w-full h-full resize-none p-6 border-none outline-none bg-white text-gray-900 font-mono text-sm leading-relaxed cursor-text"
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}
                  autoFocus={!editQuestionId}
                />
              ) : (
                // Vditor编辑器
                <div className="w-full h-full">
                  {typeof window !== 'undefined' && (
                    <MarkdownEditor
                      value={content}
                      onChange={(value) => setContent(value || '')}
                      height={window.innerHeight - 200}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 