'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import TagSelectionModal from './TagSelectionModal';

// 动态导入支持图片上传的MarkdownEditor
const MarkdownEditorWithUpload = dynamic(
  () => import('./MarkdownEditorWithUpload'),
  { ssr: false }
);

interface CreatePostProps {
  onPostCreated?: () => void;
  editPostId?: string; // 编辑模式时的文章ID
  onClose?: () => void; // 关闭时的回调
}

interface Tag {
  _id: string;
  name: string;
  description: string;
  color: string;
  usageCount: number;
}

export default function CreatePost({ onPostCreated, editPostId, onClose }: CreatePostProps) {
  const router = useRouter();
  const editorRef = useRef<{ 
    markAsSaved: () => void;
    getUploadedImageIds: () => string[];
  }>(null);
  // 如果有editPostId或onClose回调，说明是从外部调用，应该直接显示全屏
  const [isOpen, setIsOpen] = useState<boolean>(Boolean(editPostId || onClose));
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [originalPost, setOriginalPost] = useState<any>(null); // 存储原始文章数据
  const [useSimpleEditor, setUseSimpleEditor] = useState(false); // 编辑器模式切换
  
  // 标签相关状态
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  // 获取可用标签
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/posts/tags');
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(data.tags || []);
        }
      } catch (error) {
        console.error('获取标签失败:', error);
      }
    };
    
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  // 编辑模式：获取文章数据
  useEffect(() => {
    const fetchPostData = async () => {
      if (!editPostId) return;
      
      try {
        const response = await fetch(`/api/posts/${editPostId}`);
        if (response.ok) {
          const post = await response.json();
          setOriginalPost(post);
          setTitle(post.title);
          setContent(post.content);
          setSelectedTags(post.tags || []);
          setIsOpen(true); // 编辑模式直接打开
          
          console.log('编辑模式已加载文章内容:', {
            title: post.title,
            contentLength: post.content?.length || 0,
            tags: post.tags,
            type: post.type
          });
        }
      } catch (error) {
        console.error('获取文章数据失败:', error);
        setError('获取文章数据失败');
      }
    };
    
    if (editPostId) {
      fetchPostData();
    }
  }, [editPostId]);

  // 自动检测大文档并建议切换编辑器
  useEffect(() => {
    if (content.length > 5000 && !useSimpleEditor) {
      // 可以在这里添加提示用户切换到简单编辑器的逻辑
    }
  }, [content.length, useSimpleEditor]);

  // 阻止页面滚动
  useEffect(() => {
    const shouldShowFullScreen = Boolean(editPostId || onClose || isOpen);
    
    if (shouldShowFullScreen) {
      // 保存当前滚动位置
      const scrollY = window.scrollY;
      // 使用更安全的方式阻止页面滚动，不影响滚动条显示
      const originalStyle = window.getComputedStyle(document.body).overflow;
      const originalPaddingRight = window.getComputedStyle(document.body).paddingRight;
      
      // 计算滚动条宽度
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      document.body.style.overflow = 'hidden';
      // 补偿滚动条宽度，防止页面内容向左偏移
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      return () => {
        // 恢复页面滚动
        document.body.style.overflow = originalStyle;
        document.body.style.paddingRight = originalPaddingRight;
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, editPostId, onClose]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handlePublish();
  };

  const handlePublish = async () => {
    setError(null);
    setLoading(true);

    if (!title.trim() || !content.trim()) {
      setError('标题和内容不能为空');
      setLoading(false);
      return;
    }

    try {
      const url = editPostId ? `/api/posts/${editPostId}` : '/api/posts';
      const method = editPostId ? 'PUT' : 'POST';
      
      // 获取上传的图片ID列表
      const imageIds = editorRef.current?.getUploadedImageIds() || [];
      
      const body: any = {
        title: title.trim(),
        content: content.trim(),
        summary: content.trim().substring(0, 200) + '...',
        tags: selectedTags,
        type: 'article',
        imageIds, // 传递图片ID列表
      };

      // 编辑模式的状态处理
      if (editPostId) {
        // 如果原来是已发布状态，保持已发布；否则提交审核
        body.reviewStatus = originalPost?.reviewStatus === 'published' ? 'published' : 'pending';
      } else {
        // 新建模式提交审核
        body.status = 'pending';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || (editPostId ? '更新失败' : '发布失败'));
      }

      // 标记图片已保存
      editorRef.current?.markAsSaved();
      
      // 重置表单
      resetForm();
      setIsOpen(false);
      
      if (onPostCreated) {
        onPostCreated();
      }
      router.refresh();
      
      // 显示成功提示
      toast.success(editPostId ? '更新成功！' : '内容已发布成功！');
    } catch (err) {
      setError(err instanceof Error ? err.message : (editPostId ? '更新失败，请稍后重试' : '发布失败，请稍后重试'));
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
      const url = editPostId ? `/api/posts/${editPostId}` : '/api/posts';
      const method = editPostId ? 'PUT' : 'POST';
      
      // 获取上传的图片ID列表
      const imageIds = editorRef.current?.getUploadedImageIds() || [];
      
      const body: any = {
        title: title.trim(),
        content: content.trim(),
        summary: content.trim().substring(0, 200) + '...',
        tags: selectedTags,
        type: 'article',
        imageIds, // 传递图片ID列表
      };

      // 编辑模式和新建模式都保存为草稿
      if (editPostId) {
        body.reviewStatus = 'draft';
      } else {
        body.status = 'draft';
      }

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

      // 标记图片已保存
      editorRef.current?.markAsSaved();
      
      // 重置表单
      resetForm();
      setIsOpen(false);
      
      if (onPostCreated) {
        onPostCreated();
      }
      
      // 显示保存成功提示
      toast.success('保存成功！可在用户中心查看和继续编辑');
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
    setOriginalPost(null);
    setUseSimpleEditor(false);
    setError(null);
  };

  const handleClose = () => {
    // 重置所有状态
    resetForm();
    setIsOpen(false);
    
    // 调用外部的关闭回调
    if (onClose) {
      onClose();
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



  // 如果是从外部调用（有editPostId或onClose），强制显示全屏界面
  const shouldShowFullScreen = Boolean(editPostId || onClose || isOpen);

  // 如果不应该显示全屏界面，显示浮动按钮
  if (!shouldShowFullScreen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 z-50 group"
      >
        <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col" style={{ overflow: 'hidden' }}>
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="关闭编辑器"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-900">
            {editPostId ? '编辑内容' : '创建新内容'}
          </h1>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              'bg-blue-100 text-blue-700'
            }`}>
              📝 文章
            </span>
            {content.length > 0 && (
              <span className="text-sm text-gray-500">
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

          {/* 保存按钮 */}
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
            onClick={handlePublish}
            disabled={loading || savingDraft || !title.trim() || !content.trim()}
            className={`flex items-center space-x-2 font-medium py-2 px-6 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white`}
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
                <span>发布</span>
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
          <div className="p-6 space-y-8 overflow-y-auto flex-1">
            {/* 标题输入 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <label className="text-sm font-semibold text-gray-800">
                  文章标题 <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入一个吸引人的标题..."
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 shadow-sm hover:border-gray-300"
                  required
                />
                {title.length > 0 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      title.length > 50 ? 'bg-red-100 text-red-600' : 
                      title.length > 30 ? 'bg-yellow-100 text-yellow-600' : 
                      'bg-green-100 text-green-600'
                    }`}>
                      {title.length}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                💡 好的标题能提高文章的点击率和搜索排名
              </p>
            </div>

            {/* 标签选择 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <label className="text-sm font-semibold text-gray-800">
                  标签分类
                </label>
                <span className="text-xs text-gray-500">
                  (最多选择5个)
                </span>
              </div>
              
              {/* 已选择的标签 */}
              {selectedTags.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    已选择的标签
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg text-sm font-medium border border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-sm"
                      >
                        <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 p-0.5 text-blue-500 hover:text-blue-700 hover:bg-blue-200 rounded-full transition-colors"
                          title="移除标签"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 标签搜索框 */}
              {selectedTags.length < 5 && (
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={tagSearchTerm}
                      onChange={(e) => setTagSearchTerm(e.target.value)}
                      placeholder="搜索标签..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 shadow-sm hover:border-gray-300"
                    />
                    {tagSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setTagSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 热门标签 */}
              {selectedTags.length < 5 && !tagSearchTerm && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">热门标签</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTagModalOpen(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      查看更多
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const filteredTags = availableTags.filter(tag => !selectedTags.includes(tag.name));
                      const tagsToShow = filteredTags.slice(0, 10);
                      
                      return tagsToShow.map((tag) => (
                        <button
                          key={tag._id}
                          type="button"
                          onClick={() => addTag(tag.name)}
                          className="inline-flex items-center px-3 py-1.5 bg-white text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all duration-200 text-sm border border-gray-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                        >
                          <svg className="w-3 h-3 mr-1.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                          {tag.name}
                          <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                            {tag.usageCount}
                          </span>
                        </button>
                      ));
                    })()}
                  </div>
                  {availableTags.length > 10 && (
                    <div className="text-center py-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        还有 {availableTags.length - 10} 个标签
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 搜索结果 */}
              {tagSearchTerm && (
                <div className="border-2 border-gray-200 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                  {(() => {
                    const filteredTags = availableTags.filter(tag => 
                      tag.name.toLowerCase().includes(tagSearchTerm.toLowerCase()) &&
                      !selectedTags.includes(tag.name)
                    );

                    if (filteredTags.length === 0) {
                      return (
                        <div className="p-4 text-center">
                          <div className="text-sm text-gray-500 mb-3">
                            <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            未找到匹配的标签
                          </div>

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
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-all duration-200 border-b border-gray-100 last:border-b-0 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-400 mr-3 group-hover:text-blue-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">{tag.name}</span>
                          </div>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                            {tag.usageCount} 次使用
                          </span>
                        </div>
                        {tag.description && (
                          <div className="text-xs text-gray-500 mt-2 ml-7 group-hover:text-gray-600 transition-colors">
                            {tag.description}
                          </div>
                        )}
                      </button>
                    ));
                  })()}
                </div>
              )}

              {/* 标签统计和帮助信息 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${selectedTags.length >= 5 ? 'bg-red-400' : selectedTags.length >= 3 ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                    <span className="text-sm font-medium text-gray-700">
                      已选择 {selectedTags.length}/5 个标签
                    </span>
                  </div>
                  {selectedTags.length >= 5 && (
                    <span className="text-xs text-red-600 font-medium">已达上限</span>
                  )}
                </div>
                <div className="text-xs text-gray-600 leading-relaxed">
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>合适的标签能让更多人发现你的文章</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧编辑器区域 */}
        <div className="flex-1 flex flex-col min-h-0">
                    
          <div className="flex-1 min-h-0 bg-white">
            {useSimpleEditor ? (
              // 简单文本编辑器
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="开始编写你的文章...\n\n💡 快速入门：\n# 这是一级标题\n## 这是二级标题\n\n**粗体文字** 和 *斜体文字*\n\n- 无序列表\n1. 有序列表\n\n```javascript\n// 代码块\nconsole.log('Hello World');\n```\n\n> 这是引用文字\n\n[这是链接](https://example.com)\n\n---\n现在开始创作你的内容吧！"
                className="w-full h-full resize-none p-6 border-none outline-none bg-white text-gray-900 font-mono text-sm leading-relaxed cursor-text"
                style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}
                autoFocus={!editPostId}
                onClick={(e) => {
                  // 确保点击后能正确获取焦点和光标位置
                  const textarea = e.currentTarget;
                  setTimeout(() => {
                    textarea.focus();
                  }, 0);
                }}
                onFocus={(e) => {
                  // 焦点时将光标移到内容末尾（如果是新建）
                  if (!editPostId && content.length === 0) {
                    e.currentTarget.setSelectionRange(0, 0);
                  }
                }}
              />
            ) : (
              // Vditor编辑器
              <div className="w-full h-full">
                {typeof window !== 'undefined' && (
                  <MarkdownEditorWithUpload
                    ref={editorRef}
                    value={content}
                    onChange={(value) => setContent(value || '')}
                    height={window.innerHeight - 80}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 标签选择弹框 */}
      <TagSelectionModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        availableTags={availableTags}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        maxTags={5}
        title="选择标签"
        themeColor="blue"
      />
    </div>
  );
} 