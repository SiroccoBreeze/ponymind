'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// 动态导入组件，避免SSR问题
const MarkdownPreview = dynamic(() => import('@/components/MarkdownPreview'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
});
const TableOfContents = dynamic(() => import('@/components/TableOfContents'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
});
const CommentInput = dynamic(() => import('@/components/CommentInput'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
});
const ReplyInput = dynamic(() => import('@/components/ReplyInput'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-20 rounded-lg"></div>
});

interface Post {
  _id: string;
  title: string;
  content: string;
  summary: string;
  type: 'article' | 'question';
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  tags: string[];
  views: number;
  likes: number;
  answers: number;
  acceptedAnswer?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  status?: 'open' | 'answered' | 'closed';
  bounty?: number;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    avatar?: string;
  };
  likes: number;
  likedBy?: string[];
  isAccepted?: boolean;
  images?: string[];
  replies?: Comment[];
  parentComment?: string;
  createdAt: string;
}

// 通用图片弹窗组件
function ImagePreviewModal({ src, alt, open, onClose }: { src: string; alt?: string; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
      style={{ minHeight: '100vh', minWidth: '100vw' }}
      onClick={onClose}
    >
      {/* 关闭按钮，固定在右上角 */}
      <button
        onClick={onClose}
        className="absolute top-6 right-8 text-white hover:text-gray-300 z-60 bg-black bg-opacity-50 rounded-full p-2 transition-colors"
        title="关闭"
        style={{ zIndex: 60 }}
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {/* 图片内容 */}
      <div
        className="flex flex-col items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt || '图片'}
          className="rounded-lg transition-opacity duration-300 max-w-[80vw] max-h-[80vh] object-contain bg-background"
        />
        {alt && (
          <span className="mt-4 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded max-w-md text-center">
            {alt}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [processingAnswer, setProcessingAnswer] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewAlt, setPreviewAlt] = useState<string | undefined>(undefined);

  
  const postId = params?.id as string;

  // 缓存和优化渲染
  const hasTableOfContents = useMemo(() => {
    if (!post?.content) return false;
    return /^#{1,6}\s/m.test(post.content);
  }, [post?.content]);

  // 稳定的内容引用，避免不必要的重渲染
  const stableContent = useMemo(() => post?.content || '', [post?.content]);

  // 检查是否为问题作者
  const isQuestionAuthor = useMemo(() => {
    return post?.type === 'question' && 
           session?.user?.email && 
           post?.author?.email === session.user.email;
  }, [post, session]);

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    
    try {
      const response = await fetch(`/api/posts/${postId}`);
      if (response.ok) {
        const data = await response.json();
        setPost(data);
      } else if (response.status === 404) {
        router.push('/404');
      }
    } catch (error) {
      console.error('获取文章失败:', error);
    }
  }, [postId, router]);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    
    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      if (response.ok) {
        const data = await response.json();
        let sortedComments = data.comments || [];
        
        // 如果是问题，将采纳的答案置顶
        if (post?.type === 'question') {
          sortedComments = sortedComments.sort((a: Comment, b: Comment) => {
            if (a.isAccepted && !b.isAccepted) return -1;
            if (!a.isAccepted && b.isAccepted) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
        }
        
        setComments(sortedComments);
      }
    } catch (error) {
      console.error('获取评论失败:', error);
    }
  }, [postId, post?.type]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPost(), fetchComments()]);
      setLoading(false);
    };
    
    loadData();
  }, [fetchPost, fetchComments]);

  const handleLike = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLiked(data.liked);
        setPost(prev => prev ? { ...prev, likes: data.likes } : null);
      }
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };



  // 提交回复
  const handleSubmitReply = async (parentCommentId: string, content: string, images: string[]) => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!content.trim()) return;

    setSubmittingReply(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          parentCommentId,
          images,
        }),
      });

      if (response.ok) {
        setReplyingTo(null);
        await fetchComments(); // 重新获取评论
      } else {
        toast.error('回复失败，请重试');
      }
    } catch (error) {
      console.error('回复失败:', error);
      toast.error('回复失败，请重试');
    } finally {
      setSubmittingReply(false);
    }
  };

  // 展开的回复状态
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  // 切换回复展开状态
  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedReplies(newExpanded);
  };

  // 获取所有回复（扁平化）
  const getAllReplies = (comment: Comment): Comment[] => {
    let allReplies: Comment[] = [];
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.forEach(reply => {
        allReplies.push(reply);
        allReplies = allReplies.concat(getAllReplies(reply));
      });
    }
    return allReplies;
  };

  // 渲染主评论
  const renderMainComment = (comment: Comment) => {
    const allReplies = getAllReplies(comment);
    const isExpanded = expandedReplies.has(comment._id);

    return (
      <div key={comment._id} className={`border-b border-border pb-6 last:border-b-0 ${comment.isAccepted ? 'bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800' : ''}`}>
        <div className="flex items-start space-x-3">
          <Avatar className="w-10 h-10 text-base">
            <AvatarImage src={comment.author.avatar || undefined} alt={comment.author.name} />
            <AvatarFallback>{comment.author.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-medium text-foreground">{comment.author.name}</h3>
              <time className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString('zh-CN')}
              </time>
              {comment.isAccepted && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  最佳答案
                </span>
              )}
            </div>
            
            <div className="mb-3">
              <MarkdownPreview content={comment.content} />
            </div>
            
            {/* 评论图片弹窗预览 */}
            {comment.images && comment.images.length > 0 && (
              <div className="mb-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {comment.images.map((imageUrl, index) => (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`评论图片 ${index + 1}`}
                      className="rounded border border-border max-h-48 object-cover w-full cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        setPreviewImage(imageUrl);
                        setPreviewAlt(`评论图片 ${index + 1}`);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
                <button className="inline-flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>{comment.likes}</span>
                </button>
                <button className="inline-flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13l3 3 7-7" />
                  </svg>
                </button>
                <button 
                  onClick={() => setReplyingTo(comment._id)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  回复
                </button>
              </div>
              
              {/* 标记最佳答案按钮 - 只对问题作者显示 */}
              {isQuestionAuthor && (
                <button
                  onClick={() => handleToggleBestAnswer(comment._id, comment.isAccepted || false)}
                  disabled={!!processingAnswer}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    comment.isAccepted
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  } disabled:opacity-50`}
                >
                  {processingAnswer === comment._id ? '处理中...' : (comment.isAccepted ? '取消最佳答案' : '标记为最佳答案')}
                </button>
              )}
            </div>

            {/* 回复数量和展开按钮 */}
            {allReplies.length > 0 && (
              <button
                onClick={() => toggleReplies(comment._id)}
                className="flex items-center space-x-1 text-primary text-sm hover:text-primary/80 transition-colors mb-3"
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span>{allReplies.length} 条回复</span>
              </button>
            )}

            {/* 回复输入框 */}
            {replyingTo === comment._id && (
              <div className="mt-3">
                <ReplyInput
                  onSubmit={(content, images) => {
                    handleSubmitReply(comment._id, content, images);
                  }}
                  onCancel={() => {
                    setReplyingTo(null);
                  }}
                  isSubmitting={submittingReply}
                  postId={postId}
                />
              </div>
            )}

            {/* 展开的回复列表 */}
            {isExpanded && allReplies.length > 0 && (
              <div className="mt-4 space-y-3">
                {allReplies.map((reply) => {
                  // 找到这个回复是回复谁的
                  const findParentAuthor = (): string | null => {
                    if (reply.parentComment === comment._id) {
                      return comment.author.name;
                    }
                    // 在所有回复中查找父回复
                    const parentReply = allReplies.find(r => r._id === reply.parentComment);
                    return parentReply ? parentReply.author.name : null;
                  };

                  const parentAuthor = findParentAuthor();

                  return (
                    <div key={reply._id} className="flex items-start space-x-3">
                      <Avatar className="w-10 h-10 text-base">
                        <AvatarImage src={reply.author.avatar || undefined} alt={reply.author.name} />
                        <AvatarFallback>{reply.author.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground">{reply.author.name}</h4>
                          <time className="text-xs text-muted-foreground">
                            {new Date(reply.createdAt).toLocaleDateString('zh-CN')}
                          </time>
                        </div>
                        <div className="text-sm text-foreground">
                          {parentAuthor && parentAuthor !== comment.author.name && (
                            <span className="text-primary font-medium">@{parentAuthor}：</span>
                          )}
                          <MarkdownPreview content={reply.content} />
                        </div>
                        
                        {/* 渲染回复的图片弹窗预览 */}
                        {reply.images && reply.images.length > 0 && (
                          <div className="mt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {reply.images.map((imageUrl, imgIndex) => (
                                <img
                                  key={imgIndex}
                                  src={imageUrl}
                                  alt={`回复图片 ${imgIndex + 1}`}
                                  className="rounded border border-border max-h-32 object-cover w-full cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => {
                                    setPreviewImage(imageUrl);
                                    setPreviewAlt(`回复图片 ${imgIndex + 1}`);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center space-x-3 mt-2">
                          <button className="inline-flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span>{reply.likes || 0}</span>
                          </button>
                          <button className="inline-flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13l3 3 7-7" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => setReplyingTo(reply._id)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            回复
                          </button>
                        </div>

                        {/* 子回复的回复输入框 */}
                        {replyingTo === reply._id && (
                          <div className="mt-3">
                            <ReplyInput
                              onSubmit={(content, images) => {
                                handleSubmitReply(reply._id, content, images);
                              }}
                              onCancel={() => {
                                setReplyingTo(null);
                              }}
                              isSubmitting={submittingReply}
                              postId={postId}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 标记/取消最佳答案
  const handleToggleBestAnswer = async (commentId: string, isAccepted: boolean) => {
    if (!session || !isQuestionAuthor) return;

    setProcessingAnswer(commentId);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          action: isAccepted ? 'unaccept' : 'accept'
        }),
      });

      if (response.ok) {
        // 重新获取数据以更新状态
        await Promise.all([fetchPost(), fetchComments()]);
        
        const data = await response.json();
        toast.success(data.message);
      } else {
        const error = await response.json();
        toast.error(error.error || '操作失败');
      }
    } catch (error) {
      console.error('标记最佳答案失败:', error);
      toast.error('操作失败，请重试');
    } finally {
      setProcessingAnswer(null);
    }
  };





  const getStatusBadge = (status: string) => {
    const config = {
      'open': { label: '待解决', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      'answered': { label: '已解决', color: 'bg-green-100 text-green-800 border-green-200' },
      'closed': { label: '已关闭', color: 'bg-muted text-muted-foreground border-border' }
    };
    const statusConfig = config[status as keyof typeof config];
    if (!statusConfig) return null;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return <div>文章不存在</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 面包屑导航 */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">
            首页
          </Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-foreground">{post.title}</span>
        </nav>

        <div className="flex gap-8">
          {/* 主要内容区域 */}
          <div className="flex-1 min-w-0">
            <header className="mb-8">
              {/* 标题和状态标签 */}
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-3xl font-bold text-foreground leading-tight flex-1 mr-4">
                  {post.title}
                </h1>
                <div className="flex items-center space-x-2">
                  {post.type === 'question' && post.status && getStatusBadge(post.status)}
                </div>
              </div>

              {/* 作者信息 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10 text-base">
                    <AvatarImage src={post.author.avatar || undefined} alt={post.author.name} />
                    <AvatarFallback>{post.author.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{post.author.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* 统计信息 */}
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>{post.views}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>{post.likes}</span>
                  </div>
                  {post.type === 'question' && (
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>{post.answers}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 标签 */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* 文章内容 */}
            <article className="prose prose-lg max-w-none mb-12">
              <MarkdownPreview content={stableContent} />
            </article>

            {/* 操作按钮 */}
            <div className="flex items-center space-x-3 mb-12 pb-6 border-b border-border">
              <button
                onClick={handleLike}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  liked 
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                    : 'bg-background text-muted-foreground border-border hover:bg-accent'
                }`}
              >
                <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{liked ? '已点赞' : '点赞'}</span>
              </button>

              <button className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-border bg-background text-muted-foreground hover:bg-accent transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span>分享</span>
              </button>
            </div>

            {/* 评论区域 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                {post.type === 'question' ? `${comments.length} 个回答` : `${comments.length} 条评论`}
              </h2>

              {/* 评论列表 */}
              <div className="space-y-6 mb-8">
                {comments.map((comment) => renderMainComment(comment))}
              </div>

              {/* 添加评论 */}
              <div className="mt-8">
                <h3 className="text-lg font-medium text-foreground mb-4">
                  {post.type === 'question' ? '你的回答' : '添加评论'}
                </h3>
                
                {!showCommentInput ? (
                  <button
                    onClick={() => setShowCommentInput(true)}
                    className="w-full px-4 py-3 text-left text-muted-foreground bg-muted border border-border rounded-lg hover:bg-accent hover:border-border transition-colors"
                  >
                    {post.type === 'question' ? '写下你的回答...' : '写下你的想法...'}
                  </button>
                ) : (
                  <CommentInput
                    onSubmit={async (content, images) => {
                      if (!session) {
                        router.push('/auth/signin');
                        return;
                      }
                      
                      setSubmittingComment(true);
                      try {
                        const response = await fetch(`/api/posts/${postId}/comments`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            content,
                            images,
                          }),
                        });

                        if (response.ok) {
                          setShowCommentInput(false);
                          await fetchComments();
                        } else {
                          toast.error('发布失败，请重试');
                        }
                      } catch (error) {
                        console.error('发布评论失败:', error);
                        toast.error('发布失败，请重试');
                      } finally {
                        setSubmittingComment(false);
                      }
                    }}
                    onCancel={() => setShowCommentInput(false)}
                    placeholder={post.type === 'question' ? '请详细回答这个问题...' : '写下你的想法...'}
                    isSubmitting={submittingComment}
                    postId={postId}
                  />
                )}
              </div>
            </section>
          </div>

          {/* 右侧目录 - 仅在有目录时显示 */}
          {hasTableOfContents && (
            <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0">
              <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
                <div className="px-4">
                  <TableOfContents content={stableContent} />
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
      {/* 全局图片预览弹窗 */}
      <ImagePreviewModal src={previewImage || ''} alt={previewAlt} open={!!previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
} 