'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  MessageSquare,
  User,
  FileText,
  Calendar,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Upload,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import dynamic from 'next/dynamic';

// 动态导入 MarkdownPreview 组件
const MarkdownPreview = dynamic(() => import('@/components/MarkdownPreview'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-muted h-20 rounded"></div>
});

interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  post: {
    _id: string;
    title: string;
    type: 'article' | 'question';
  };
  parentComment?: {
    _id: string;
    author: {
      name: string;
    };
  };
  likes: number;
  isAccepted?: boolean;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

interface CommentFilters {
  search: string;
  status: 'all' | 'accepted' | 'not-accepted';
  type: 'all' | 'article' | 'question';
  sortBy: 'createdAt' | 'likes' | 'author';
  sortOrder: 'asc' | 'desc';
}

interface UploadedImage {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  isConfirmed: boolean;
}

export default function CommentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalComments, setTotalComments] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState<CommentFilters>({
    search: '',
    status: 'all',
    type: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // 编辑相关状态
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // 删除相关状态
  const [deletingComment, setDeletingComment] = useState<Comment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 查看详情状态
  const [viewingComment, setViewingComment] = useState<Comment | null>(null);

  // 图片上传相关状态
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: filters.search,
        status: filters.status,
        type: filters.type,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      const response = await fetch(`/api/admin/comments?${params}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
        setTotalComments(data.total);
      } else {
        toast.error('获取评论列表失败');
      }
    } catch (error) {
      console.error('获取评论失败:', error);
      toast.error('获取评论列表失败');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleEdit = (comment: Comment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
    setUploadedImages(comment.images?.map((url, index) => ({
      id: `existing-${index}`,
      filename: `image-${index}`,
      originalName: `图片${index + 1}`,
      url,
      size: 0,
      isConfirmed: true
    })) || []);
  };

  const handleSaveEdit = async () => {
    if (!editingComment || !editContent.trim()) return;

    setIsEditing(true);
    try {
      const response = await fetch(`/api/admin/comments/${editingComment._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent.trim(),
          images: uploadedImages.map(img => img.url)
        }),
      });

      if (response.ok) {
        toast.success('评论更新成功');
        setEditingComment(null);
        setEditContent('');
        setUploadedImages([]);
        fetchComments();
      } else {
        toast.error('更新失败');
      }
    } catch (error) {
      console.error('更新评论失败:', error);
      toast.error('更新失败');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingComment) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/comments/${deletingComment._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('评论删除成功');
        setDeletingComment(null);
        fetchComments();
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      console.error('删除评论失败:', error);
      toast.error('删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFilterChange = (key: keyof CommentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // 图片上传相关函数
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('文件选择事件触发', event.target.files);
    const files = Array.from(event.target.files || []);
    console.log('选择的文件:', files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleUploadImages = async () => {
    if (selectedFiles.length === 0) return;

    setUploadingImages(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      console.log('开始上传图片，文件数量:', selectedFiles.length);

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('上传响应状态:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('上传成功，返回数据:', data);
        setUploadedImages(prev => [...prev, ...data.images]);
        setSelectedFiles([]);
        toast.success(`成功上传 ${data.images.length} 张图片`);
      } else {
        const error = await response.json();
        console.error('上传失败:', error);
        toast.error(error.error || '上传失败');
      }
    } catch (error) {
      console.error('上传图片失败:', error);
      toast.error('上传失败');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    setDeletingImage(imageId);
    try {
      // 如果是新上传的图片，调用删除API
      if (!imageId.startsWith('existing-')) {
        const response = await fetch(`/api/images/${imageId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          toast.error('删除图片失败');
          return;
        }
      }

      // 从本地状态中移除
      setUploadedImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('图片删除成功');
    } catch (error) {
      console.error('删除图片失败:', error);
      toast.error('删除图片失败');
    } finally {
      setDeletingImage(null);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const totalPages = Math.ceil(totalComments / pageSize);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">请先登录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">评论管理</h1>
          <p className="text-muted-foreground mt-2">
            管理平台上的所有评论，包括查看、编辑和删除操作
          </p>
        </div>
        <Button onClick={fetchComments} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总评论数</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalComments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最佳答案</CardTitle>
            <Badge variant="secondary" className="h-4 w-4">✓</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {comments.filter(c => c.isAccepted).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">文章评论</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {comments.filter(c => c.post.type === 'article').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">问题回答</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {comments.filter(c => c.post.type === 'question').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            筛选和搜索
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索评论内容..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="accepted">最佳答案</SelectItem>
                <SelectItem value="not-accepted">普通评论</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="article">文章评论</SelectItem>
                <SelectItem value="question">问题回答</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger>
                <SelectValue placeholder="排序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">发布时间</SelectItem>
                <SelectItem value="likes">点赞数</SelectItem>
                <SelectItem value="author">作者</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.sortOrder} onValueChange={(value) => handleFilterChange('sortOrder', value)}>
              <SelectTrigger>
                <SelectValue placeholder="顺序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">降序</SelectItem>
                <SelectItem value="asc">升序</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 评论列表 */}
      <Card>
        <CardHeader>
          <CardTitle>评论列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无评论</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment._id} className="border rounded-lg p-4 space-y-3">
                  {/* 评论头部信息 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author.avatar} />
                        <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{comment.author.name}</span>
                          {comment.isAccepted && (
                            <Badge variant="default" className="text-xs">最佳答案</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setViewingComment(comment)}>
                          <Eye className="h-4 w-4 mr-2" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(comment)}>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeletingComment(comment)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* 评论内容 */}
                  <div className="text-sm text-foreground">
                    {truncateContent(comment.content)}
                  </div>

                  {/* 评论元信息 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <span>👍 {comment.likes}</span>
                      <span>📝 {comment.post.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {comment.post.type === 'article' ? '文章' : '问题'}
                      </Badge>
                      {comment.parentComment && (
                        <span>回复 @{comment.parentComment.author.name}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {comment.images && comment.images.length > 0 && (
                        <span>🖼️ {comment.images.length}张图片</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                第 {currentPage} 页，共 {totalPages} 页
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={!!editingComment} onOpenChange={() => {
        setEditingComment(null);
        setEditContent('');
        setUploadedImages([]);
        setSelectedFiles([]);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑评论</DialogTitle>
            <DialogDescription>
              修改评论内容和图片，支持 Markdown 格式
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-content">评论内容</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="输入评论内容..."
                className="min-h-[200px]"
              />
            </div>

            {/* 图片管理 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>图片管理</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      console.log('点击选择图片按钮');
                      document.getElementById('image-upload')?.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    选择图片
                  </Button>
                  {selectedFiles.length > 0 && (
                    <Button 
                      onClick={handleUploadImages} 
                      disabled={uploadingImages}
                      size="sm"
                    >
                      {uploadingImages ? '上传中...' : '上传'}
                    </Button>
                  )}
                </div>
              </div>

              {/* 待上传的图片 */}
              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeSelectedFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* 已上传的图片 */}
              {uploadedImages.length > 0 && (
                <div className="space-y-2">
                  <Label>已上传的图片</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {uploadedImages.map((image) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.url}
                          alt={image.originalName}
                          className="w-full h-24 object-cover rounded border"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteImage(image.id)}
                          disabled={deletingImage === image.id}
                        >
                          {deletingImage === image.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>预览</Label>
              <div className="border rounded-lg p-4 bg-muted/50">
                <MarkdownPreview content={editContent} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditingComment(null);
              setEditContent('');
              setUploadedImages([]);
              setSelectedFiles([]);
            }}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={isEditing || !editContent.trim()}>
              {isEditing ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={!!deletingComment} onOpenChange={() => setDeletingComment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这条评论吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {deletingComment?.content.substring(0, 100)}...
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingComment(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看详情对话框 */}
      <Dialog open={!!viewingComment} onOpenChange={() => setViewingComment(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>评论详情</DialogTitle>
          </DialogHeader>
          {viewingComment && (
            <div className="space-y-4">
              {/* 作者信息 */}
              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={viewingComment.author.avatar} />
                  <AvatarFallback>{viewingComment.author.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{viewingComment.author.name}</span>
                    <span className="text-sm text-muted-foreground">{viewingComment.author.email}</span>
                    {viewingComment.isAccepted && (
                      <Badge variant="default">最佳答案</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    发布于 {formatDate(viewingComment.createdAt)}
                  </div>
                </div>
              </div>

              {/* 所属文章 */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">所属内容</span>
                </div>
                <div className="text-sm">
                  <div className="flex items-center space-x-2">
                    <span>{viewingComment.post.title}</span>
                    <Badge variant="outline">
                      {viewingComment.post.type === 'article' ? '文章' : '问题'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* 评论内容 */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium">评论内容</span>
                  <Badge variant="outline">👍 {viewingComment.likes}</Badge>
                </div>
                <div className="prose prose-sm max-w-none">
                  <MarkdownPreview content={viewingComment.content} />
                </div>
              </div>

              {/* 图片 */}
              {viewingComment.images && viewingComment.images.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <ImageIcon className="h-4 w-4" />
                    <span className="font-medium">图片 ({viewingComment.images.length}张)</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {viewingComment.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`图片 ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 回复信息 */}
              {viewingComment.parentComment && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium">回复</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    回复 @{viewingComment.parentComment.author.name}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewingComment(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 