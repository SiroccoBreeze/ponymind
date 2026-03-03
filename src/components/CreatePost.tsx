'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import TagSelectionModal from './TagSelectionModal';
import { X, FileEdit, Tag, Search, Loader2, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
        // 新建模式：提交审核，需要管理员审核后才能发布
        body.reviewStatus = 'pending';
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
      if (editPostId) {
        toast.success('更新成功！');
      } else {
        toast.success('内容已提交审核，等待管理员审核后即可发布！');
      }
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

  if (!shouldShowFullScreen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="创建新内容"
        className="fixed bottom-8 right-8 bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover:shadow-[0_0_20px_rgba(58,127,245,0.35)] hover:-translate-y-0.5 transition-all duration-200 z-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <FileEdit className="w-6 h-6" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col" style={{ overflow: 'hidden' }}>
      {/* 顶部导航栏 — MASTER §8.5 玻璃感 / 卡片 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={handleClose}
            aria-label="关闭编辑器"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            {editPostId ? '编辑内容' : '创建新内容'}
          </h1>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
              文章
            </span>
            {content.length > 0 && (
              <span className="text-sm text-muted-foreground tabular-nums">{content.length} 字符</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setUseSimpleEditor(!useSimpleEditor)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              useSimpleEditor
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}
          >
            {useSimpleEditor ? '简单模式' : '富文本模式'}
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || !title.trim()}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg bg-background text-foreground hover:bg-accent font-medium text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {savingDraft && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
            <span>{savingDraft ? '保存中…' : '保存草稿'}</span>
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={loading || savingDraft || !title.trim() || !content.trim()}
            className="flex items-center gap-2 font-medium py-2 px-6 rounded-lg bg-primary text-primary-foreground hover:opacity-90 shadow-sm hover:shadow-[0_0_20px_rgba(58,127,245,0.25)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                <span>发布中…</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" strokeWidth={1.5} />
                <span>发布</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" strokeWidth={1.5} />
          <span className="text-destructive text-sm">{error}</span>
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧设置面板 — MASTER §8.2 输入框 */}
        <div className="w-80 border-r border-border bg-muted/30 flex flex-col">
          <div className="p-6 space-y-8 overflow-y-auto flex-1">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-primary" strokeWidth={1.5} />
                <label htmlFor="create-title" className="text-sm font-semibold text-foreground">
                  文章标题 <span className="text-destructive">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  id="create-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入一个吸引人的标题…"
                  className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
                  required
                />
                {title.length > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full tabular-nums ${
                        title.length > 50
                          ? 'bg-destructive/10 text-destructive'
                          : title.length > 30
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {title.length}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                好的标题能提高文章的点击率和搜索排名
              </p>
            </div>

            {/* 标签选择 — MASTER token + Lucide */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" strokeWidth={1.5} />
                <label className="text-sm font-semibold text-foreground">标签分类</label>
                <span className="text-xs text-muted-foreground">(最多选择5个)</span>
              </div>

              {selectedTags.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
                    已选择的标签
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium border border-primary/20"
                      >
                        <Tag className="w-3 h-3 mr-2" strokeWidth={1.5} />
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 p-0.5 text-primary hover:text-primary/80 hover:bg-primary/20 rounded-full transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                          title="移除标签"
                          aria-label={`移除标签 ${tag}`}
                        >
                          <X className="w-3 h-3" strokeWidth={1.5} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTags.length < 5 && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
                    <input
                      type="text"
                      value={tagSearchTerm}
                      onChange={(e) => setTagSearchTerm(e.target.value)}
                      placeholder="搜索标签…"
                      className="w-full pl-10 pr-10 py-2.5 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
                    />
                    {tagSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setTagSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary rounded"
                        aria-label="清空"
                      >
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedTags.length < 5 && !tagSearchTerm && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">热门标签</span>
                    <button
                      type="button"
                      onClick={() => setIsTagModalOpen(true)}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
                    >
                      查看更多
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableTags
                      .filter((tag) => !selectedTags.includes(tag.name))
                      .slice(0, 10)
                      .map((tag) => (
                        <button
                          key={tag._id}
                          type="button"
                          onClick={() => addTag(tag.name)}
                          className="inline-flex items-center px-3 py-1.5 bg-background text-foreground rounded-lg border border-border hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all duration-200 text-sm hover:-translate-y-0.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                        >
                          <Tag className="w-3 h-3 mr-1.5 text-muted-foreground" strokeWidth={1.5} />
                          {tag.name}
                          <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
                            {tag.usageCount}
                          </span>
                        </button>
                      ))}
                  </div>
                  {availableTags.length > 10 && (
                    <div className="text-center py-2">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        还有 {availableTags.length - 10} 个标签
                      </span>
                    </div>
                  )}
                </div>
              )}

              {tagSearchTerm && (
                <div className="border border-border rounded-lg bg-card shadow-sm max-h-48 overflow-y-auto">
                  {(() => {
                    const filteredTags = availableTags.filter(
                      (tag) =>
                        tag.name.toLowerCase().includes(tagSearchTerm.toLowerCase()) &&
                        !selectedTags.includes(tag.name)
                    );
                    if (filteredTags.length === 0) {
                      return (
                        <div className="p-4 text-center">
                          <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" strokeWidth={1.5} />
                          <p className="text-sm text-muted-foreground">未找到匹配的标签</p>
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
                        className="w-full text-left px-4 py-3 hover:bg-accent transition-colors duration-200 border-b border-border last:border-b-0 group cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Tag className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
                            <span className="font-medium text-foreground group-hover:text-primary transition-colors">{tag.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full tabular-nums">
                            {tag.usageCount} 次使用
                          </span>
                        </div>
                        {tag.description && (
                          <div className="text-xs text-muted-foreground mt-2 ml-7">{tag.description}</div>
                        )}
                      </button>
                    ));
                  })()}
                </div>
              )}

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        selectedTags.length >= 5 ? 'bg-destructive' : selectedTags.length >= 3 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                    <span className="text-sm font-medium text-foreground">已选择 {selectedTags.length}/5 个标签</span>
                  </div>
                  {selectedTags.length >= 5 && (
                    <span className="text-xs text-destructive font-medium">已达上限</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">合适的标签能让更多人发现你的文章</p>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧编辑器区域 */}
        <div className="flex-1 flex flex-col min-h-0">
                    
          <div className="flex-1 min-h-0 bg-background">
            {useSimpleEditor ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="开始编写你的文章…\n\n快速入门：\n# 一级标题\n## 二级标题\n\n**粗体** *斜体*\n\n- 无序列表\n1. 有序列表\n\n\`\`\`javascript\n// 代码块\n\`\`\`\n\n> 引用\n\n[链接](url)\n\n---\n现在开始创作吧！"
                className="w-full h-full resize-none p-6 border-none outline-none bg-background text-foreground font-mono text-sm leading-relaxed cursor-text placeholder:text-muted-foreground"
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