'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Mail, Calendar, MapPin, Globe, FileText, Shield, Activity } from 'lucide-react';

interface UserDetail {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'inactive' | 'banned';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  posts: Array<{ _id: string; title: string }>;
}

interface UserDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  onUserUpdated: () => void;
}

export default function UserDetailDialog({ open, onOpenChange, userId, onUserUpdated }: UserDetailDialogProps) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    bio: '',
    location: '',
    website: '',
    role: 'user' as 'user' | 'moderator' | 'admin',
    status: 'active' as 'active' | 'inactive' | 'banned'
  });
  const [newPassword, setNewPassword] = useState('');

  // 获取用户详细信息
  const fetchUserDetail = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setEditForm({
          name: userData.name || '',
          email: userData.email || '',
          bio: userData.bio || '',
          location: userData.location || '',
          website: userData.website || '',
          role: userData.role || 'user',
          status: userData.status || 'active'
        });
      } else {
        setError('获取用户信息失败');
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      setError('获取用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存用户信息
  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // 准备更新数据
      const updateData = { ...editForm };
      
      // 如果有新密码，先更新密码
      if (newPassword.trim()) {
        const passwordResponse = await fetch('/api/admin/users/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user._id,
            newPassword: newPassword.trim()
          }),
        });
        
        if (!passwordResponse.ok) {
          const errorData = await passwordResponse.json();
          setError(errorData.error || '密码修改失败');
          setSaving(false);
          return;
        }
      }
      
      // 更新用户信息
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        setSuccess('用户信息更新成功');
        setIsEditing(false);
        setNewPassword(''); // 清空密码字段
        onUserUpdated();
        // 重新获取用户信息
        await fetchUserDetail();
      } else {
        const errorData = await response.json();
        setError(errorData.error || '更新失败');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      setError('更新失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        role: user.role || 'user',
        status: user.status || 'active'
      });
    }
    setNewPassword(''); // 清空密码字段
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  // 当弹框打开时获取用户信息
  useEffect(() => {
    if (open && userId) {
      fetchUserDetail();
    }
  }, [open, userId]);

  // 当弹框关闭时重置状态
  useEffect(() => {
    if (!open) {
      setUser(null);
      setIsEditing(false);
      setError(null);
      setSuccess(null);
      setLoading(false);
      setSaving(false);
      setNewPassword(''); // 清空密码字段
    }
  }, [open]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未知';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'moderator': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'banned': return 'destructive';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '管理员';
      case 'moderator': return '版主';
      default: return '用户';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '活跃';
      case 'inactive': return '非活跃';
      case 'banned': return '已封禁';
      default: return '未知';
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              加载中...
            </DialogTitle>
            <DialogDescription>
              正在获取用户信息，请稍候
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center h-32">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">正在加载用户信息...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditing ? '编辑用户信息' : '用户详细信息'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? '修改用户的基本信息和权限设置' : '查看用户的完整信息和统计数据'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {user && (
          <div className="space-y-6">
            {/* 用户头像和基本信息 */}
            <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
              <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                <AvatarImage src={user.avatar || undefined} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-2xl font-bold">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">{user.name}</h3>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(user.status)}>
                    {getStatusLabel(user.status)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                
                {user.bio && (
                  <p className="text-sm text-muted-foreground">{user.bio}</p>
                )}
              </div>
            </div>

            {/* 编辑表单或只读信息 */}
            {isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">用户名 *</Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="请输入用户名"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    disabled
                    className="bg-muted cursor-not-allowed"
                    placeholder="邮箱不可编辑"
                  />
                  
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">角色</Label>
                  <Select 
                    value={editForm.role} 
                    onValueChange={(value: 'user' | 'moderator' | 'admin') => 
                      setEditForm(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">用户</SelectItem>
                      <SelectItem value="moderator">版主</SelectItem>
                      <SelectItem value="admin">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">状态</Label>
                  <Select 
                    value={editForm.status} 
                    onValueChange={(value: 'active' | 'inactive' | 'banned') => 
                      setEditForm(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">活跃</SelectItem>
                      <SelectItem value="inactive">非活跃</SelectItem>
                      <SelectItem value="banned">已封禁</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">位置</Label>
                  <Input
                    id="location"
                    value={editForm.location}
                    onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="请输入位置"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website">网站</Label>
                  <Input
                    id="website"
                    value={editForm.website}
                    onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="请输入网站地址"
                  />
                </div>
                
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="newPassword">新密码</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="留空则不修改密码"
                  />
                  <p className="text-xs text-muted-foreground">输入新密码以修改用户密码，留空则保持原密码不变</p>
                </div>
                
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="bio">个人简介</Label>
                  <Textarea
                    id="bio"
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="请输入个人简介"
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">注册时间</span>
                    <span className="text-sm font-medium">{formatDate(user.createdAt)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">最后登录</span>
                    <span className="text-sm font-medium">{formatDate(user.lastLoginAt)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">文章数量</span>
                    <Badge variant="outline">{user.posts?.length || 0}</Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {user.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">位置</span>
                      <span className="text-sm font-medium">{user.location}</span>
                    </div>
                  )}
                  
                  {user.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">网站</span>
                      <a 
                        href={user.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {user.website}
                      </a>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">更新时间</span>
                    <span className="text-sm font-medium">{formatDate(user.updatedAt)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                编辑用户
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
