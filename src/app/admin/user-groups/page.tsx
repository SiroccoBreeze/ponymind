'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { useEffect, useState, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Loader2,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { displayLocalTime } from '@/lib/frontend-time-utils';

interface UserGroup {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  members: Array<{ _id: string; name: string; email: string; avatar?: string }>;
  createdBy: { _id: string; name: string; email: string };
  isActive: boolean;
  color: string;
  icon: string;
  createdAt: string;
  memberCount: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
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
    activeGroups: number;
    totalUsers: number;
  };
}

export default function UserGroupsManagement() {
  const [data, setData] = useState<UserGroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [addGroupError, setAddGroupError] = useState<string | null>(null);
  const [addGroupForm, setAddGroupForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    color: '#3b82f6',
    icon: 'users'
  });

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [editGroupForm, setEditGroupForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    color: '#3b82f6',
    icon: 'users',
    isActive: true
  });

  // 用户管理相关状态
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [bulkOperation, setBulkOperation] = useState<'add' | 'remove' | null>(null);

  const permissionOptions = [
    { value: 'read_posts', label: '阅读文章' },
    { value: 'write_posts', label: '发布文章' },
    { value: 'delete_posts', label: '删除文章' },
    { value: 'moderate_comments', label: '管理评论' },
    { value: 'manage_users', label: '管理用户' },
    { value: 'manage_tags', label: '管理标签' },
    { value: 'view_analytics', label: '查看分析' },
    { value: 'admin_access', label: '管理员权限' }
  ];

  const iconOptions = [
    { value: 'users', label: '用户组' },
    { value: 'shield', label: '安全' },
    { value: 'star', label: '星级' },
    { value: 'heart', label: '爱心' },
    { value: 'zap', label: '闪电' },
    { value: 'crown', label: '皇冠' }
  ];

  const fetchUserGroups = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm })
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
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchUserGroups();
  }, [fetchUserGroups]);

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/users?limit=100');
      if (response.ok) {
        const userData = await response.json();
        setAvailableUsers(userData.users || []);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddMember = async (groupId: string, userId: string) => {
    try {
      const response = await fetch('/api/admin/user-groups/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId, userId }),
      });

      if (response.ok) {
        await fetchUserGroups();
        if (selectedGroup) {
          const updatedGroup = await fetch(`/api/admin/user-groups?groupId=${selectedGroup._id}`);
          if (updatedGroup.ok) {
            const groupData = await updatedGroup.json();
            setSelectedGroup(groupData);
          }
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || '添加成员失败');
      }
    } catch (error) {
      console.error('添加成员失败:', error);
      alert('添加成员失败');
    }
  };

  const handleRemoveMember = async (groupId: string, userId: string) => {
    try {
      const response = await fetch(`/api/admin/user-groups/members?groupId=${groupId}&userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchUserGroups();
        if (selectedGroup) {
          const updatedGroup = await fetch(`/api/admin/user-groups?groupId=${selectedGroup._id}`);
          if (updatedGroup.ok) {
            const groupData = await updatedGroup.json();
            setSelectedGroup(groupData);
          }
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || '移除成员失败');
      }
    } catch (error) {
      console.error('移除成员失败:', error);
      alert('移除成员失败');
    }
  };

  const openMembersDialog = async (group: UserGroup) => {
    setSelectedGroup(group);
    setShowMembersDialog(true);
    setMemberSearchTerm('');
    setSelectedMembers([]);
    setBulkOperation(null);
    await fetchAvailableUsers();
  };

  const handleBulkAddMembers = async () => {
    if (!selectedGroup || selectedMembers.length === 0) return;
    
    try {
      const promises = selectedMembers.map(userId => 
        fetch('/api/admin/user-groups/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId: selectedGroup._id, userId }),
        })
      );
      
      await Promise.all(promises);
      await fetchUserGroups();
      if (selectedGroup) {
        const updatedGroup = await fetch(`/api/admin/user-groups?groupId=${selectedGroup._id}`);
        if (updatedGroup.ok) {
          const groupData = await updatedGroup.json();
          setSelectedGroup(groupData);
        }
      }
      setSelectedMembers([]);
      alert(`成功添加 ${selectedMembers.length} 个成员`);
    } catch (error) {
      console.error('批量添加成员失败:', error);
      alert('批量添加成员失败');
    }
  };

  const handleBulkRemoveMembers = async () => {
    if (!selectedGroup || selectedMembers.length === 0) return;
    
    try {
      const promises = selectedMembers.map(userId => 
        fetch(`/api/admin/user-groups/members?groupId=${selectedGroup._id}&userId=${userId}`, {
          method: 'DELETE',
        })
      );
      
      await Promise.all(promises);
      await fetchUserGroups();
      if (selectedGroup) {
        const updatedGroup = await fetch(`/api/admin/user-groups?groupId=${selectedGroup._id}`);
        if (updatedGroup.ok) {
          const groupData = await updatedGroup.json();
          setSelectedGroup(groupData);
        }
      }
      setSelectedMembers([]);
      alert(`成功移除 ${selectedMembers.length} 个成员`);
    } catch (error) {
      console.error('批量移除成员失败:', error);
      alert('批量移除成员失败');
    }
  };

  const filteredAvailableUsers = availableUsers?.filter(user => 
    !selectedGroup?.members?.some(member => member._id === user._id) &&
    (user.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(memberSearchTerm.toLowerCase()))
  ) || [];

  const filteredCurrentMembers = selectedGroup?.members?.filter(member =>
    member.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(memberSearchTerm.toLowerCase())
  ) || [];

  const handleAddGroup = async () => {
    if (!addGroupForm.name) {
      setAddGroupError('用户组名称不能为空');
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
        body: JSON.stringify(addGroupForm),
      });

      if (response.ok) {
        setAddGroupForm({
          name: '',
          description: '',
          permissions: [],
          color: '#3b82f6',
          icon: 'users'
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
    if (!editingGroup || !editGroupForm.name) {
      return;
    }

    setUpdating(editingGroup._id);
    try {
      const response = await fetch('/api/admin/user-groups', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId: editingGroup._id,
          ...editGroupForm,
        }),
      });

      if (response.ok) {
        setShowEditDialog(false);
        setEditingGroup(null);
        await fetchUserGroups();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '更新用户组失败');
      }
    } catch (error) {
      console.error('更新用户组失败:', error);
      alert('更新用户组失败');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('确定要删除这个用户组吗？')) {
      return;
    }

    setUpdating(groupId);
    try {
      const response = await fetch(`/api/admin/user-groups?groupId=${groupId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchUserGroups();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '删除用户组失败');
      }
    } catch (error) {
      console.error('删除用户组失败:', error);
      alert('删除用户组失败');
    } finally {
      setUpdating(null);
    }
  };

  const openEditDialog = (group: UserGroup) => {
    setEditingGroup(group);
    setEditGroupForm({
      name: group.name,
      description: group.description,
      permissions: group.permissions || [],
      color: group.color,
      icon: group.icon,
      isActive: group.isActive
    });
    setShowEditDialog(true);
  };

  const resetAddGroupForm = () => {
    setAddGroupForm({
      name: '',
      description: '',
      permissions: [],
      color: '#3b82f6',
      icon: 'users'
    });
    setAddGroupError(null);
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
        <div className="text-muted-foreground text-6xl">👥</div>
        <p className="text-muted-foreground text-lg">加载数据失败</p>
        <Button onClick={() => window.location.reload()}>
          重新加载
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">用户组管理</h1>
          <p className="text-muted-foreground">管理系统中的用户组和权限</p>
        </div>
        <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索用户组..."
              className="w-64"
            />
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加用户组
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>添加新用户组</DialogTitle>
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
                    用户组名称 *
                  </Label>
                  <Input
                    id="name"
                    value={addGroupForm.name}
                    onChange={(e) => setAddGroupForm(prev => ({ ...prev, name: e.target.value }))}
                    className="col-span-3"
                    placeholder="请输入用户组名称"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    描述
                  </Label>
                  <Input
                    id="description"
                    value={addGroupForm.description}
                    onChange={(e) => setAddGroupForm(prev => ({ ...prev, description: e.target.value }))}
                    className="col-span-3"
                    placeholder="请输入用户组描述"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="color" className="text-right">
                    颜色
                  </Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      type="color"
                      value={addGroupForm.color}
                      onChange={(e) => setAddGroupForm(prev => ({ ...prev, color: e.target.value }))}
                      className="w-16 h-10"
                    />
                    <Input
                      value={addGroupForm.color}
                      onChange={(e) => setAddGroupForm(prev => ({ ...prev, color: e.target.value }))}
                      className="flex-1"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="icon" className="text-right">
                    图标
                  </Label>
                  <select 
                    value={addGroupForm.icon} 
                    onChange={(e) => setAddGroupForm(prev => ({ ...prev, icon: e.target.value }))}
                    className="col-span-3 px-3 py-2 border border-input bg-background rounded-md"
                  >
                    {iconOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">
                    权限
                  </Label>
                  <div className="col-span-3 space-y-2">
                    {permissionOptions.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.value}
                          checked={addGroupForm.permissions.includes(option.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAddGroupForm(prev => ({
                                ...prev,
                                permissions: [...prev.permissions, option.value]
                              }));
                            } else {
                              setAddGroupForm(prev => ({
                                ...prev,
                                permissions: prev.permissions.filter(p => p !== option.value)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={option.value} className="text-sm">
                          {option.label}
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
                    resetAddGroupForm();
                  }}
                >
                  取消
                </Button>
                <Button 
                  type="submit" 
                  onClick={handleAddGroup}
                  disabled={addingGroup}
                >
                  {addingGroup ? '添加中...' : '添加用户组'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 用户组表格 */}
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">用户组列表</h3>
            <Badge variant="secondary">
              共 {data.pagination?.total || 0} 个用户组
            </Badge>
          </div>
        </div>
        <div className="p-0">
          {data.userGroups?.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="text-muted-foreground text-6xl">👥</div>
              <h3 className="text-lg font-medium">暂无用户组</h3>
              <p className="text-muted-foreground">还没有创建任何用户组，点击上方按钮开始创建</p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                创建第一个用户组
              </Button>
            </div>
          ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">用户组</TableHead>
                  <TableHead className="font-semibold">成员数</TableHead>
                    <TableHead className="font-semibold">权限</TableHead>
                    <TableHead className="font-semibold">状态</TableHead>
                  <TableHead className="font-semibold">创建时间</TableHead>
                  <TableHead className="font-semibold text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {data.userGroups?.map((group) => (
                  <TableRow key={group._id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                            style={{ backgroundColor: group.color }}
                          >
                            {group.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                        <div className="font-medium">{group.name}</div>
                            <div className="text-sm text-muted-foreground">{group.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                          {group.memberCount || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {group.permissions?.slice(0, 3).map(permission => (
                            <Badge key={permission} variant="secondary" className="text-xs">
                              {permissionOptions.find(p => p.value === permission)?.label || permission}
                            </Badge>
                          ))}
                          {group.permissions && group.permissions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{group.permissions.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={group.isActive ? "default" : "secondary"}>
                          {group.isActive ? '活跃' : '非活跃'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                        {formatDate(group.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                        {updating === group._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                              onClick={() => openMembersDialog(group)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                              <UserPlus className="h-4 w-4 mr-1" />
                              成员
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
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}
        </div>
      </div>

      {/* 分页 */}
      {data.pagination && data.pagination.total > 0 && (
        <div className="flex items-center justify-between py-4">
            <div className="text-sm text-muted-foreground">
            显示 {((currentPage - 1) * 10) + 1} 到 {Math.min(currentPage * 10, data.pagination?.total || 0)} 条，
            共 {data.pagination?.total || 0} 条记录
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
              第 {currentPage} 页，共 {data.pagination?.pages || 1} 页
              </span>
              <Button
                variant="outline"
                size="sm"
              onClick={() => setCurrentPage(Math.min(data.pagination?.pages || 1, currentPage + 1))}
              disabled={currentPage === (data.pagination?.pages || 1)}
              >
                下一页
              </Button>
            </div>
          </div>
      )}

      {/* 编辑用户组对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑用户组</DialogTitle>
            <DialogDescription>
              修改用户组信息、权限和状态。
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                用户组名称 *
              </Label>
              <Input
                id="edit-name"
                value={editGroupForm.name}
                onChange={(e) => setEditGroupForm(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                placeholder="请输入用户组名称"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                描述
              </Label>
              <Input
                id="edit-description"
                value={editGroupForm.description}
                onChange={(e) => setEditGroupForm(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
                placeholder="请输入用户组描述"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-color" className="text-right">
                颜色
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  type="color"
                  value={editGroupForm.color}
                  onChange={(e) => setEditGroupForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-16 h-10"
                />
                <Input
                  value={editGroupForm.color}
                  onChange={(e) => setEditGroupForm(prev => ({ ...prev, color: e.target.value }))}
                  className="flex-1"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-icon" className="text-right">
                图标
              </Label>
              <select 
                value={editGroupForm.icon} 
                onChange={(e) => setEditGroupForm(prev => ({ ...prev, icon: e.target.value }))}
                className="col-span-3 px-3 py-2 border border-input bg-background rounded-md"
              >
                {iconOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">
                状态
              </Label>
              <select 
                value={editGroupForm.isActive ? 'active' : 'inactive'} 
                onChange={(e) => setEditGroupForm(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
                className="col-span-3 px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="active">活跃</option>
                <option value="inactive">非活跃</option>
              </select>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                权限
              </Label>
              <div className="col-span-3 space-y-2">
                {permissionOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${option.value}`}
                      checked={editGroupForm.permissions.includes(option.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEditGroupForm(prev => ({
                            ...prev,
                            permissions: [...prev.permissions, option.value]
                          }));
                        } else {
                          setEditGroupForm(prev => ({
                            ...prev,
                            permissions: prev.permissions.filter(p => p !== option.value)
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={`edit-${option.value}`} className="text-sm">
                      {option.label}
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
              onClick={() => setShowEditDialog(false)}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              onClick={handleEditGroup}
              disabled={updating === editingGroup?._id}
            >
              {updating === editingGroup?._id ? '更新中...' : '更新用户组'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 成员管理对话框 */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>管理用户组成员 - {selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              管理用户组的成员，支持搜索、批量操作。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* 搜索栏 */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                    placeholder="搜索用户..."
                    className="pl-10"
                  />
                </div>
                </div>
              {selectedMembers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    已选择 {selectedMembers.length} 个用户
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMembers([])}
                  >
                    清除选择
                  </Button>
              </div>
              )}
              </div>
              
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 当前成员 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">当前成员 ({filteredCurrentMembers.length})</h4>
                  {selectedMembers.length > 0 && bulkOperation === 'remove' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkRemoveMembers}
                    >
                      批量移除 ({selectedMembers.length})
                    </Button>
                  )}
                </div>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {filteredCurrentMembers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {memberSearchTerm ? '未找到匹配的成员' : '暂无成员'}
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {filteredCurrentMembers.map((member) => (
                        <div key={member._id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={selectedMembers.includes(member._id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMembers([...selectedMembers, member._id]);
                                  setBulkOperation('remove');
                                } else {
                                  setSelectedMembers(selectedMembers.filter(id => id !== member._id));
                                  if (selectedMembers.length === 1) setBulkOperation(null);
                                }
                              }}
                            />
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatar} alt={member.name} />
                              <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
              <div>
                              <div className="font-medium text-sm">{member.name}</div>
                              <div className="text-xs text-muted-foreground">{member.email}</div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(selectedGroup!._id, member._id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                    </div>
                  ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* 可添加的用户 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">可添加用户 ({filteredAvailableUsers.length})</h4>
                  {selectedMembers.length > 0 && bulkOperation === 'add' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleBulkAddMembers}
                    >
                      批量添加 ({selectedMembers.length})
                    </Button>
                  )}
                </div>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">加载用户列表...</span>
                    </div>
                  ) : filteredAvailableUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {memberSearchTerm ? '未找到匹配的用户' : '所有用户都已是成员'}
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {filteredAvailableUsers.map((user) => (
                        <div key={user._id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={selectedMembers.includes(user._id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMembers([...selectedMembers, user._id]);
                                  setBulkOperation('add');
                                } else {
                                  setSelectedMembers(selectedMembers.filter(id => id !== user._id));
                                  if (selectedMembers.length === 1) setBulkOperation(null);
                                }
                              }}
                            />
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                <div>
                              <div className="font-medium text-sm">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
              </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddMember(selectedGroup!._id, user._id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
            </div>
          )}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
                onClick={() => {
                setShowMembersDialog(false);
                setMemberSearchTerm('');
                setSelectedMembers([]);
                setBulkOperation(null);
              }}
            >
              关闭
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}