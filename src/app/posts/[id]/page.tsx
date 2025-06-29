'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// 动态导入组件，避免SSR问题
const MarkdownPreview = dynamic(() => import('@/components/MarkdownPreview'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
});
const TableOfContents = dynamic(() => import('@/components/TableOfContents'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
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
  isAccepted?: boolean;
  createdAt: string;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [processingAnswer, setProcessingAnswer] = useState<string | null>(null);
  
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
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('获取评论失败:', error);
    }
  }, [postId]);

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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        setNewComment('');
        await fetchComments(); // 重新获取评论
      } else {
        alert('发布失败，请重试');
      }
    } catch (error) {
      console.error('发布评论失败:', error);
      alert('发布失败，请重试');
    } finally {
      setSubmittingComment(false);
    }
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
        alert(data.message);
      } else {
        const error = await response.json();
        alert(error.error || '操作失败');
      }
    } catch (error) {
      console.error('标记最佳答案失败:', error);
      alert('操作失败，请重试');
    } finally {
      setProcessingAnswer(null);
    }
  };

  // 防抖处理评论输入
  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
  }, []);

  const getDifficultyBadge = (difficulty: string) => {
    const config = {
      'beginner': { label: '入门', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      'intermediate': { label: '中级', color: 'bg-amber-100 text-amber-700 border-amber-200' },
      'advanced': { label: '高级', color: 'bg-red-100 text-red-700 border-red-200' }
    };
    const difficultyConfig = config[difficulty as keyof typeof config];
    if (!difficultyConfig) return null;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${difficultyConfig.color}`}>
        {difficultyConfig.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = {
      'open': { label: '待解决', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      'answered': { label: '已解决', color: 'bg-green-100 text-green-800 border-green-200' },
      'closed': { label: '已关闭', color: 'bg-gray-100 text-gray-800 border-gray-200' }
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return <div>文章不存在</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 面包屑导航 */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            首页
          </Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900">{post.title}</span>
        </nav>

        <div className="flex gap-8">
          {/* 主要内容区域 */}
          <div className="flex-1 min-w-0">
            <header className="mb-8">
              {/* 标题和状态标签 */}
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900 leading-tight flex-1 mr-4">
                  {post.title}
                </h1>
                <div className="flex items-center space-x-2">
                  {post.type === 'question' && post.status && getStatusBadge(post.status)}
                  {post.difficulty && getDifficultyBadge(post.difficulty)}
                </div>
              </div>

              {/* 作者信息 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <img
                    src={post.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.name)}&background=3b82f6&color=fff`}
                    alt={post.author.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{post.author.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* 统计信息 */}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
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
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
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
            <div className="flex items-center space-x-3 mb-12 pb-6 border-b border-gray-200">
              <button
                onClick={handleLike}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  liked 
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{liked ? '已点赞' : '点赞'}</span>
              </button>

              <button className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span>分享</span>
              </button>
            </div>

            {/* 评论区域 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {post.type === 'question' ? `${comments.length} 个回答` : `${comments.length} 条评论`}
              </h2>

              {/* 评论列表 */}
              <div className="space-y-8 mb-8">
                {comments.map((comment) => (
                  <div key={comment._id} className={`border-b border-gray-200 pb-8 last:border-b-0 ${comment.isAccepted ? 'bg-green-50 rounded-lg p-6 border border-green-200' : ''}`}>
                    <div className="flex items-start space-x-4">
                      <img
                        src={comment.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author.name)}&background=3b82f6&color=fff`}
                        alt={comment.author.name}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-medium text-gray-900">{comment.author.name}</h3>
                            {comment.isAccepted && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                最佳答案
                              </span>
                            )}
                          </div>
                          <time className="text-sm text-gray-500">
                            {new Date(comment.createdAt).toLocaleDateString('zh-CN')}
                          </time>
                        </div>
                        <div className="prose prose-sm max-w-none mb-4">
                          <MarkdownPreview content={comment.content} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <button className="inline-flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              <span>{comment.likes}</span>
                            </button>
                            <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                              回复
                            </button>
                          </div>
                          
                          {/* 标记最佳答案按钮 - 只对问题作者显示 */}
                          {isQuestionAuthor && (
                            <button
                              onClick={() => handleToggleBestAnswer(comment._id, comment.isAccepted || false)}
                              disabled={processingAnswer === comment._id}
                              className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                comment.isAccepted
                                  ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                                  : 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {processingAnswer === comment._id ? (
                                <>
                                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span>处理中...</span>
                                </>
                              ) : comment.isAccepted ? (
                                <>
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                  <span>取消采纳</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  <span>采纳答案</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 添加评论 */}
              {session?.user ? (
                <div className="border border-gray-200 rounded-lg p-6">
                  <form onSubmit={handleSubmitComment} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {post.type === 'question' ? '你的回答' : '添加评论'}
                      </label>
                      <textarea
                        value={newComment}
                        onChange={handleCommentChange}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                        placeholder={post.type === 'question' ? '请详细回答这个问题...' : '写下你的想法...'}
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingComment || !newComment.trim()}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {submittingComment ? '发布中...' : (post.type === 'question' ? '发布回答' : '发布评论')}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-gray-600 mb-4">
                    {post.type === 'question' ? '登录后可以回答问题' : '登录后可以发表评论'}
                  </p>
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    立即登录
                  </Link>
                </div>
              )}
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
    </div>
  );
} 