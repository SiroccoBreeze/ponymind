'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserDetailDialog from '@/components/UserDetailDialog';
import { PaginationBar } from '@/components/PaginationBar';

import { useEffect, useState } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Search, 
  RotateCcw,
  Loader2,
  Filter,
  Download,
  Plus,
  Crown,
  UserCog,
  Activity,
  Eye,
  UserPlus
} from 'lucide-react';
import { displayLocalTime } from '@/lib/frontend-time-utils';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'inactive' | 'banned';
  createdAt: string;
  posts: Array<{ _id: string; title: string }>;
}

interface UserData {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: {
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    bannedUsers: number;
  };
}

export default function UsersManagement() {
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserForm, setAddUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'moderator' | 'admin',
    status: 'active' as 'active' | 'inactive' | 'banned'
  });


  const [showUserDetailDialog, setShowUserDetailDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const userData = await response.json();
        setData(userData);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, roleFilter, statusFilter]);

  const handleUpdateUser = async (userId: string, updates: { role?: string; status?: string }) => {
    setUpdating(userId);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...updates,
        }),
      });

      if (response.ok) {
        await fetchUsers();
      } else {
        alert('更新失败');
      }
    } catch (error) {
      console.error('更新用户失败:', error);
      alert('更新失败');
    } finally {
      setUpdating(null);
    }
  };

  const handleAddUser = async () => {
    if (!addUserForm.name || !addUserForm.email || !addUserForm.password) {
      setAddUserError('请填写所有必填字段');
      return;
    }

    setAddingUser(true);
    setAddUserError(null);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addUserForm),
      });

      if (response.ok) {
        // 重置表单并关闭对话框
        setAddUserForm({
          name: '',
          email: '',
          password: '',
          role: 'user',
          status: 'active'
        });
        setShowAddDialog(false);
        // 刷新用户列表
        await fetchUsers();
      } else {
        const errorData = await response.json();
        setAddUserError(errorData.error || '添加用户失败');
      }
    } catch (error) {
      console.error('添加用户失败:', error);
      setAddUserError('添加用户失败，请稍后重试');
    } finally {
      setAddingUser(false);
    }
  };

  const resetAddUserForm = () => {
    setAddUserForm({
      name: '',
      email: '',
      password: '',
      role: 'user',
      status: 'active'
    });
    setAddUserError(null);
  };



  const openUserDetailDialog = (userId: string) => {
    setSelectedUserId(userId);
    setShowUserDetailDialog(true);
  };

  const formatDate = (dateString: string) => {
    return displayLocalTime(dateString, 'date');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">正在加载用户数据...</p>
            <p className="text-sm text-muted-foreground">请稍候，正在获取用户信息</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-muted-foreground text-6xl">👥</div>
        <p className="text-muted-foreground text-lg">加载数据失败</p>
        <Button onClick={() => window.location.reload()}>
          重新加载
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            用户管理
          </h1>
          <p className="text-muted-foreground">管理系统中的所有用户账户、用户组和权限</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            用户列表
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            用户组管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-8">
          <div className="flex justify-end">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  添加用户
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>添加新用户</DialogTitle>
                <DialogDescription>
                  创建新的用户账户，设置用户名、邮箱、密码和权限。
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                {addUserError && (
                  <Alert variant="destructive">
                    <AlertDescription>{addUserError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    用户名 *
                  </Label>
                  <Input
                    id="name"
                    value={addUserForm.name}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, name: e.target.value }))}
                    className="col-span-3"
                    placeholder="请输入用户名"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    邮箱 *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={addUserForm.email}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="col-span-3"
                    placeholder="请输入邮箱地址"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    密码 *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={addUserForm.password}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="col-span-3"
                    placeholder="请输入密码"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    角色
                  </Label>
                  <Select 
                    value={addUserForm.role} 
                    onValueChange={(value: 'user' | 'moderator' | 'admin') => 
                      setAddUserForm(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">用户</SelectItem>
                      <SelectItem value="moderator">版主</SelectItem>
                      <SelectItem value="admin">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    状态
                  </Label>
                  <Select 
                    value={addUserForm.status} 
                    onValueChange={(value: 'active' | 'inactive' | 'banned') => 
                      setAddUserForm(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">活跃</SelectItem>
                      <SelectItem value="inactive">非活跃</SelectItem>
                      <SelectItem value="banned">已封禁</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowAddDialog(false);
                    resetAddUserForm();
                  }}
                >
                  取消
                </Button>
                <Button 
                  type="submit" 
                  onClick={handleAddUser}
                  disabled={addingUser}
                >
                  {addingUser ? '添加中...' : '添加用户'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">注册用户总数</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg">
              <UserCheck className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">当前活跃用户</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">管理员</CardTitle>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
              <Crown className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{data.stats.adminUsers}</div>
            <p className="text-xs text-muted-foreground">系统管理员</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已封禁用户</CardTitle>
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
              <UserX className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.stats.bannedUsers}</div>
            <p className="text-xs text-muted-foreground">被封禁账户</p>
          </CardContent>
        </Card>
        </div>

        {/* 筛选器 */}
        <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-primary" />
            <CardTitle>筛选用户</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">搜索用户</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索用户名或邮箱..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">角色筛选</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="全部角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部角色</SelectItem>
                  <SelectItem value="user">用户</SelectItem>
                  <SelectItem value="moderator">版主</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">状态筛选</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">活跃</SelectItem>
                  <SelectItem value="inactive">非活跃</SelectItem>
                  <SelectItem value="banned">已封禁</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                                  setRoleFilter('all');
                setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                重置筛选
              </Button>
            </div>
          </div>
        </CardContent>
        </Card>

        {/* 用户表格 */}
        <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserCog className="h-5 w-5 text-primary" />
              <CardTitle>用户列表</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              共 {data.pagination.total} 个用户
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">用户</TableHead>
                  <TableHead className="font-semibold">角色</TableHead>
                  <TableHead className="font-semibold">状态</TableHead>
                  <TableHead className="font-semibold">文章数</TableHead>
                  <TableHead className="font-semibold">注册时间</TableHead>
                  <TableHead className="font-semibold text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user) => (
                  <TableRow key={user._id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                          <AvatarImage src={user.avatar || undefined} alt={user.name} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleUpdateUser(user._id, { role: value })}
                        disabled={updating === user._id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">用户</SelectItem>
                          <SelectItem value="moderator">版主</SelectItem>
                          <SelectItem value="admin">管理员</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.status}
                        onValueChange={(value) => handleUpdateUser(user._id, { status: value })}
                        disabled={updating === user._id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">活跃</SelectItem>
                          <SelectItem value="inactive">非活跃</SelectItem>
                          <SelectItem value="banned">已封禁</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {user.posts?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {updating === user._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openUserDetailDialog(user._id)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            查看详情
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        </Card>

        {/* 分页 */}
        <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              共 {data.pagination.total} 条记录
            </div>
            <PaginationBar
              currentPage={currentPage}
              totalPages={data.pagination.pages}
              onPageChange={setCurrentPage}
              totalCount={data.pagination.total}
              pageSize={data.pagination.limit}
              ariaLabel="用户列表分页"
            />
          </div>
        </CardContent>
        </Card>

          {/* 用户详情弹框 */}
          <UserDetailDialog
            open={showUserDetailDialog}
            onOpenChange={setShowUserDetailDialog}
            userId={selectedUserId}
            onUserUpdated={fetchUsers}
          />
        </TabsContent>

        <TabsContent value="groups" className="space-y-8">
          <div className="text-center py-12 space-y-4">
            <div className="text-muted-foreground text-6xl">👥</div>
            <h3 className="text-lg font-medium">用户组管理</h3>
            <p className="text-muted-foreground">用户组管理功能已移至独立页面</p>
            <Button onClick={() => window.location.href = '/admin/user-groups'}>
              前往用户组管理
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 