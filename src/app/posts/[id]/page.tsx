'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import '@uiw/react-md-editor/markdown-editor.css';

// 动态导入Markdown预览组件
const MarkdownPreview = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default.Markdown),
  { ssr: false }
);

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
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState(false);

  const postId = params.id as string;

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`);
      if (!response.ok) {
        throw new Error('获取内容失败');
      }
      const data = await response.json();
      setPost(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取内容失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error('获取评论失败:', err);
    }
  };

  const handleLike = async () => {
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        setLiked(!liked);
        setPost(prev => prev ? {
          ...prev,
          likes: liked ? prev.likes - 1 : prev.likes + 1
        } : null);
      }
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    if (!newComment.trim()) {
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
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        setNewComment('');
        fetchComments();
        // 更新回答数
        setPost(prev => prev ? {
          ...prev,
          answers: prev.answers + 1
        } : null);
      }
    } catch (err) {
      console.error('提交评论失败:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    const config = {
      'beginner': { label: '新手', color: 'bg-green-100 text-green-800' },
      'intermediate': { label: '中级', color: 'bg-yellow-100 text-yellow-800' },
      'advanced': { label: '高级', color: 'bg-red-100 text-red-800' }
    };
    const diffConfig = config[difficulty as keyof typeof config] || config.intermediate;
    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${diffConfig.color}`}>
        {diffConfig.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = {
      'open': { label: '待解决', color: 'bg-orange-100 text-orange-800' },
      'answered': { label: '已回答', color: 'bg-blue-100 text-blue-800' },
      'closed': { label: '已关闭', color: 'bg-gray-100 text-gray-800' }
    };
    const statusConfig = config[status as keyof typeof config] || config.open;
    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md mx-auto">
              <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-lg font-semibold text-red-900 mb-2">出错了</h3>
              <p className="text-red-700 mb-4">{error || '请检查链接是否正确'}</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => router.back()}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                >
                  返回
                </button>
                <button
                  onClick={() => fetchPost()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  重试
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
        </div>

        {/* 主要内容 */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
          {/* 头部信息 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                post.type === 'question' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {post.type === 'question' ? '问题' : '文章'}
              </span>
              
              {post.type === 'question' && post.difficulty && getDifficultyBadge(post.difficulty)}
              {post.type === 'question' && post.status && getStatusBadge(post.status)}
              
              {post.bounty && post.bounty > 0 && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  💰 {post.bounty} 积分
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>

            {/* 作者和时间信息 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={post.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.name)}&background=3b82f6&color=fff`}
                    alt={post.author.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{post.author.name}</p>
                    <p className="text-sm text-gray-500">
                      发布于 {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="flex items-center space-x-6 text-sm text-gray-500">
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
                    <span>{post.answers} 回答</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 标签 */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 内容 */}
          <div className="prose prose-lg max-w-none mb-8">
            {typeof window !== 'undefined' && (
              <MarkdownPreview source={post.content} />
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLike}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  liked 
                    ? 'bg-red-50 text-red-600 border border-red-200' 
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{liked ? '已点赞' : '点赞'}</span>
              </button>

              <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span>分享</span>
              </button>
            </div>

            {session?.user && session.user.email === post.author.email && (
              <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>编辑</span>
              </button>
            )}
          </div>
        </div>

        {/* 回答/评论区域 */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {post.type === 'question' ? `${comments.length} 个回答` : `${comments.length} 条评论`}
          </h2>

          {/* 评论列表 */}
          <div className="space-y-6 mb-8">
            {comments.map((comment) => (
              <div key={comment._id} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="flex items-start space-x-4">
                  <img
                    src={comment.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author.name)}&background=3b82f6&color=fff`}
                    alt={comment.author.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{comment.author.name}</p>
                        {comment.isAccepted && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                            ✓ 已采纳
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      {typeof window !== 'undefined' && (
                        <MarkdownPreview source={comment.content} />
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-3">
                      <button className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>{comment.likes}</span>
                      </button>
                      <button className="text-sm text-gray-500 hover:text-gray-700">
                        回复
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 添加评论 */}
          {session?.user ? (
            <form onSubmit={handleSubmitComment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {post.type === 'question' ? '你的回答' : '添加评论'}
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder={post.type === 'question' ? '请详细回答这个问题...' : '写下你的想法...'}
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingComment ? '提交中...' : (post.type === 'question' ? '发布回答' : '发布评论')}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-4">
                {post.type === 'question' ? '登录后回答问题' : '登录后发表评论'}
              </p>
              <Link
                href="/auth/signin"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                登录
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 