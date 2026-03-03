'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import TagSelectionModal from './TagSelectionModal';
import { X, HelpCircle, Loader2, Send, AlertTriangle, Tag, Search, CheckCircle2 } from 'lucide-react';

// 动态导入支持图片上传的MarkdownEditor
const MarkdownEditorWithUpload = dynamic(
  () => import('./MarkdownEditorWithUpload'),
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
  const editorRef = useRef<{ 
    markAsSaved: () => void;
    getUploadedImageIds: () => string[];
  }>(null);
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
      
      // 获取上传的图片ID列表
      const imageIds = editorRef.current?.getUploadedImageIds() || [];
      
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
        reviewStatus: editQuestionId && originalQuestion?.reviewStatus === 'published' ? 'published' : 'pending',
        imageIds // 传递图片ID列表
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

      // 标记图片已保存
      editorRef.current?.markAsSaved();
      
      // 重置表单并关闭
      resetForm();
      
      if (onQuestionCreated) {
        onQuestionCreated();
      }
      router.refresh();
      
      toast.success(editQuestionId ? '问题更新成功！' : '问题已发布成功！');
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

      // 标记图片已保存
      editorRef.current?.markAsSaved();
      
      resetForm();
      
      if (onQuestionCreated) {
        onQuestionCreated();
      }
      
      toast.success('草稿保存成功！可在用户中心查看和继续编辑');
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
    <div className="fixed inset-0 bg-background z-50 flex flex-col" style={{ overflow: 'hidden' }}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={handleClose}
            aria-label="关闭"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            {editQuestionId ? '编辑问题' : '提出问题'}
          </h1>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              问题
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
            onClick={handleSubmit}
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
                <span>发布问题</span>
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
        <div className="w-80 border-r border-border bg-muted/30 flex flex-col">
          <div className="p-6 space-y-8 overflow-y-auto flex-1">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
                <label htmlFor="question-title" className="text-sm font-semibold text-foreground">
                  问题标题 <span className="text-destructive">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  id="question-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="清楚地描述你遇到的问题…"
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
                清楚的问题描述更容易得到准确的答案
              </p>
            </div>

            {/* 标签选择 — MASTER token + Lucide */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
                <label className="text-sm font-semibold text-foreground">相关标签</label>
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
                        className="inline-flex items-center px-3 py-2 bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium border border-amber-500/30"
                      >
                        <Tag className="w-3 h-3 mr-2" strokeWidth={1.5} />
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 p-0.5 text-amber-600 hover:text-amber-800 hover:bg-amber-500/20 rounded-full transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
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
                          className="inline-flex items-center px-3 py-1.5 bg-background text-foreground rounded-lg border border-border hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400 hover:border-amber-500/20 transition-all duration-200 text-sm hover:-translate-y-0.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
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
                            <Tag className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" strokeWidth={1.5} />
                            <span className="font-medium text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">{tag.name}</span>
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

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-2">
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
                <p className="text-xs text-muted-foreground leading-relaxed">选择合适的标签能帮你获得更准确的回答</p>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧编辑器区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* 问题详情编辑器 */}
          <div className="flex-1 flex flex-col min-h-0">                        
            <div className="flex-1 min-h-0 bg-background">
              {useSimpleEditor ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="详细描述你遇到的问题…\n\n建议包含：问题的具体表现、重现步骤、相关代码片段、错误信息、你尝试过的解决方法。"
                  className="w-full h-full resize-none p-6 border-none outline-none bg-background text-foreground font-mono text-sm leading-relaxed cursor-text placeholder:text-muted-foreground"
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
        themeColor="orange"
      />
    </div>
  );
} 