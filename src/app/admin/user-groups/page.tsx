'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

import { useEffect, useState } from 'react';
import { 
  Users, 
  Shield, 
  Plus, 
  Search, 
  RotateCcw,
  Filter,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  Settings
} from 'lucide-react';

interface UserGroup {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UserGroupData {
  userGroups: UserGroup[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: {
    totalGroups: number;
    totalMembers: number;
    activeGroups: number;
  };
}

const availablePermissions = [
  { key: 'read_posts', label: '阅读文章' },
  { key: 'write_posts', label: '创建/编辑文章' },
  { key: 'delete_posts', label: '删除文章' },
  { key: 'moderate_comments', label: '管理评论' },
  { key: 'manage_users', label: '管理用户' },
  { key: 'manage_content', label: '管理内容' },
  { key: 'view_analytics', label: '查看分析' },
  { key: 'system_admin', label: '系统管理' }
];

export default function UserGroupsManagement() {
  const [data, setData] = useState<UserGroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [addGroupError, setAddGroupError] = useState<string | null>(null);
  const [editGroupError, setEditGroupError] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  const fetchUserGroups = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/admin/user-groups?${params}`);
      if (response.ok) {
        const groupData = await response.json();
        setData(groupData);
      }
    } catch (error) {
      console.error('获取用户组列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserGroups();
  }, [currentPage, searchTerm]);

  const handleAddGroup = async () => {
    if (!groupForm.name.trim()) {
      setAddGroupError('请输入用户组名称');
      return;
    }

    setAddingGroup(true);
    setAddGroupError(null);

    try {
      const response = await fetch('/api/admin/user-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupForm),
      });

      if (response.ok) {
        setGroupForm({
          name: '',
          description: '',
          permissions: []
        });
        setShowAddDialog(false);
        await fetchUserGroups();
      } else {
        const errorData = await response.json();
        setAddGroupError(errorData.error || '添加用户组失败');
      }
    } catch (error) {
      console.error('添加用户组失败:', error);
      setAddGroupError('添加用户组失败，请稍后重试');
    } finally {
      setAddingGroup(false);
    }
  };

  const handleEditGroup = async () => {
    if (!selectedGroup || !groupForm.name.trim()) {
      setEditGroupError('请输入用户组名称');
      return;
    }

    setEditingGroup(true);
    setEditGroupError(null);

    try {
      const response = await fetch(`/api/admin/user-groups/${selectedGroup._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupForm),
      });

      if (response.ok) {
        setShowEditDialog(false);
        setSelectedGroup(null);
        await fetchUserGroups();
      } else {
        const errorData = await response.json();
        setEditGroupError(errorData.error || '更新用户组失败');
      }
    } catch (error) {
      console.error('更新用户组失败:', error);
      setEditGroupError('更新用户组失败，请稍后重试');
    } finally {
      setEditingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('确定要删除这个用户组吗？删除后无法恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/user-groups/${groupId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchUserGroups();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('删除用户组失败:', error);
      alert('删除失败');
    }
  };

  const openEditDialog = (group: UserGroup) => {
    setSelectedGroup(group);
    setGroupForm({
      name: group.name,
      description: group.description,
      permissions: group.permissions
    });
    setShowEditDialog(true);
  };

  const openViewDialog = (group: UserGroup) => {
    setSelectedGroup(group);
    setShowViewDialog(true);
  };

  const resetForm = () => {
    setGroupForm({
      name: '',
      description: '',
      permissions: []
    });
    setAddGroupError(null);
    setEditGroupError(null);
  };

  const togglePermission = (permission: string) => {
    setGroupForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">正在加载用户组数据...</p>
            <p className="text-sm text-muted-foreground">请稍候，正在获取用户组信息</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-muted-foreground text-6xl">🛡️</div>
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
            用户组管理
          </h1>
          <p className="text-muted-foreground">管理系统中的用户组和权限配置</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            权限配置
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                创建用户组
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>创建新用户组</DialogTitle>
                <DialogDescription>
                  创建新的用户组，设置名称、描述和权限。
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                {addGroupError && (
                  <Alert variant="destructive">
                    <AlertDescription>{addGroupError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    组名称 *
                  </Label>
                  <Input
                    id="name"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                    className="col-span-3"
                    placeholder="请输入用户组名称"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    描述
                  </Label>
                  <Textarea
                    id="description"
                    value={groupForm.description}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                    className="col-span-3"
                    placeholder="请输入用户组描述"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">
                    权限设置
                  </Label>
                  <div className="col-span-3 space-y-3">
                    {availablePermissions.map((permission) => (
                      <div key={permission.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={permission.key}
                          checked={groupForm.permissions.includes(permission.key)}
                          onCheckedChange={() => togglePermission(permission.key)}
                        />
                        <Label htmlFor={permission.key} className="text-sm">
                          {permission.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowAddDialog(false);
                    resetForm();
                  }}
                >
                  取消
                </Button>
                <Button 
                  type="submit" 
                  onClick={handleAddGroup}
                  disabled={addingGroup}
                >
                  {addingGroup ? '创建中...' : '创建用户组'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户组</CardTitle>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
              <Shield className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.stats.totalGroups}</div>
            <p className="text-xs text-muted-foreground">系统用户组总数</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总成员数</CardTitle>
            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">所有用户组成员</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃用户组</CardTitle>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
              <UserCheck className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{data.stats.activeGroups}</div>
            <p className="text-xs text-muted-foreground">有成员的用户组</p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选器 */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-primary" />
            <CardTitle>筛选用户组</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">搜索用户组</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索用户组名称或描述..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
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

      {/* 用户组表格 */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>用户组列表</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              共 {data.pagination.total} 个用户组
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">用户组</TableHead>
                  <TableHead className="font-semibold">成员数</TableHead>
                  <TableHead className="font-semibold">权限数量</TableHead>
                  <TableHead className="font-semibold">创建时间</TableHead>
                  <TableHead className="font-semibold text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.userGroups.map((group) => (
                  <TableRow key={group._id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{group.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {group.description || '暂无描述'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {group.memberCount} 人
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-medium">
                        {group.permissions.length} 项
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(group.createdAt).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openViewDialog(group)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          查看
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditDialog(group)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          编辑
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteGroup(group._id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          删除
                        </Button>
                      </div>
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
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              显示 {((currentPage - 1) * 10) + 1} 到 {Math.min(currentPage * 10, data.pagination.total)} 条，
              共 {data.pagination.total} 条记录
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground px-4 py-2 bg-muted rounded-md">
                第 {currentPage} 页，共 {data.pagination.pages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(data.pagination.pages, currentPage + 1))}
                disabled={currentPage === data.pagination.pages}
              >
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 编辑用户组弹框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑用户组</DialogTitle>
            <DialogDescription>
              修改用户组信息、描述和权限设置。
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {editGroupError && (
              <Alert variant="destructive">
                <AlertDescription>{editGroupError}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                组名称 *
              </Label>
              <Input
                id="edit-name"
                value={groupForm.name}
                onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                placeholder="请输入用户组名称"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                描述
              </Label>
              <Textarea
                id="edit-description"
                value={groupForm.description}
                onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
                placeholder="请输入用户组描述"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                权限设置
              </Label>
              <div className="col-span-3 space-y-3">
                {availablePermissions.map((permission) => (
                  <div key={permission.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${permission.key}`}
                      checked={groupForm.permissions.includes(permission.key)}
                      onCheckedChange={() => togglePermission(permission.key)}
                    />
                    <Label htmlFor={`edit-${permission.key}`} className="text-sm">
                      {permission.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowEditDialog(false);
                setSelectedGroup(null);
              }}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              onClick={handleEditGroup}
              disabled={editingGroup}
            >
              {editingGroup ? '更新中...' : '更新用户组'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看用户组详情弹框 */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>用户组详情</DialogTitle>
            <DialogDescription>
              查看用户组的详细信息和权限配置。
            </DialogDescription>
          </DialogHeader>
          
          {selectedGroup && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">组名称</Label>
                  <p className="text-lg font-semibold">{selectedGroup.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">成员数量</Label>
                  <p className="text-lg font-semibold">{selectedGroup.memberCount} 人</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">描述</Label>
                <p className="text-sm mt-1">
                  {selectedGroup.description || '暂无描述'}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">权限配置</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {availablePermissions.map((permission) => (
                    <div key={permission.key} className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedGroup.permissions.includes(permission.key) 
                          ? 'bg-green-500' 
                          : 'bg-gray-300'
                      }`} />
                      <span className="text-sm">
                        {permission.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">创建时间</Label>
                  <p>{new Date(selectedGroup.createdAt).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">更新时间</Label>
                  <p>{new Date(selectedGroup.updatedAt).toLocaleString('zh-CN')}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowViewDialog(false)}
            >
              关闭
            </Button>
            {selectedGroup && (
              <Button 
                onClick={() => {
                  setShowViewDialog(false);
                  openEditDialog(selectedGroup);
                }}
              >
                编辑用户组
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
