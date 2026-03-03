"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { 
  Tag, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter,
  Download,
  Palette,
  Hash,
  Calendar,
  Activity
} from "lucide-react";
import { PaginationBar } from "@/components/PaginationBar";
import { displayLocalTime } from '@/lib/frontend-time-utils';

interface Tag {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  postCount: number;
  eventCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TagData {
  tags: Tag[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: {
    totalTags: number;
    activeTags: number;
    unusedTags: number;
  };
}

export default function TagsManagement() {
  const [data, setData] = useState<TagData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; tag: Tag | null }>({ open: false, tag: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; tagId?: string; tagName?: string; action?: 'delete' | 'restore' }>({ open: false });

  const [newTag, setNewTag] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
  });

  const predefinedColors = [
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
    "#8b5cf6", "#06b6d4", "#84cc16", "#f97316",
    "#ec4899", "#6366f1", "#14b8a6", "#eab308",
  ];

  const fetchTags = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        ...(searchTerm && { search: searchTerm }),
      });
      const response = await fetch(`/api/admin/tags?${params}`);
      if (response.ok) {
        const tagData = await response.json();
        setData(tagData);
      }
    } catch (error) {
      console.error("获取标签列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [currentPage, searchTerm]);

  const handleAddTag = async () => {
    if (!newTag.name.trim()) {
      alert("请输入标签名称");
      return;
    }
    try {
      const response = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTag),
      });
      if (response.ok) {
        setAddDialogOpen(false);
        setNewTag({ name: "", description: "", color: "#3b82f6" });
        await fetchTags();
      } else if (response.status === 409) {
        // 标签已存在但被删除，询问是否重新启用
        const errorData = await response.json();
        if (confirm(`标签 "${newTag.name}" 已存在但已被删除。是否要重新启用该标签？`)) {
          await handleRestoreTag(errorData.existingTagId);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || "添加标签失败");
      }
    } catch (error) {
      console.error("添加标签失败:", error);
      alert("添加标签失败");
    }
  };

  const handleEditTag = async () => {
    if (!editDialog.tag || !editDialog.tag.name.trim()) {
      alert("请输入标签名称");
      return;
    }
    try {
      const response = await fetch(`/api/admin/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagId: editDialog.tag._id,
          name: editDialog.tag.name,
          description: editDialog.tag.description,
          color: editDialog.tag.color
        }),
      });
      if (response.ok) {
        setEditDialog({ open: false, tag: null });
        await fetchTags();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "更新标签失败");
      }
    } catch (error) {
      console.error("更新标签失败:", error);
      alert("更新标签失败");
    }
  };

  const handleDeleteTag = (tagId: string, tagName: string) => {
    setDeleteDialog({ open: true, tagId, tagName, action: 'delete' });
  };

  const handleRestoreTag = async (tagId: string) => {
    try {
      const response = await fetch(`/api/admin/tags?tagId=${tagId}&action=restore`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchTags();
        return true;
      } else {
        const errorData = await response.json();
        alert(errorData.error || "重新启用标签失败");
        return false;
      }
    } catch (error) {
      console.error("重新启用标签失败:", error);
      alert("重新启用标签失败");
      return false;
    }
  };

  const confirmDeleteTag = async () => {
    if (!deleteDialog.tagId) return;
    try {
      const response = await fetch(`/api/admin/tags?tagId=${deleteDialog.tagId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setDeleteDialog({ open: false });
        await fetchTags();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "删除标签失败");
      }
    } catch (error) {
      console.error("删除标签失败:", error);
      alert("删除标签失败");
    }
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
              <Tag className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">正在加载标签数据...</p>
            <p className="text-sm text-muted-foreground">请稍候，正在获取标签信息</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-muted-foreground text-6xl">🏷️</div>
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
            标签管理
          </h1>
          <p className="text-muted-foreground">管理系统中的所有内容标签和分类</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出数据
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            添加标签
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总标签数</CardTitle>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
              <Tag className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.stats.totalTags}</div>
            <p className="text-xs text-muted-foreground">系统标签总数</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃标签</CardTitle>
            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg">
              <Activity className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.stats.activeTags}</div>
            <p className="text-xs text-muted-foreground">正在使用的标签</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-orange-500 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/10 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未使用标签</CardTitle>
            <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg">
              <Hash className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{data.stats.unusedTags}</div>
            <p className="text-xs text-muted-foreground">未被使用的标签</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索 */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-primary" />
            <CardTitle>搜索标签</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索标签名称或描述..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 标签表格 */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>标签列表</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              共 {data.pagination.total} 个标签
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">标签</TableHead>
                  <TableHead className="font-semibold">描述</TableHead>
                  <TableHead className="font-semibold">文章数</TableHead>
                  <TableHead className="font-semibold">事件数</TableHead>
                  <TableHead className="font-semibold">创建时间</TableHead>
                  <TableHead className="font-semibold text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tags.map((tag) => (
                  <TableRow 
                    key={tag._id} 
                    className={`hover:bg-muted/50 transition-colors ${!tag.isActive ? 'opacity-60 bg-muted/30' : ''}`}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: tag.color || "#3b82f6" }}
                        />
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className="font-medium"
                            style={{ 
                              borderColor: tag.color || "#3b82f6",
                              color: tag.color || "#3b82f6"
                            }}
                          >
                            {tag.name}
                          </Badge>
                          {!tag.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              已删除
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs">
                      <div className="truncate">
                        {tag.description || "无描述"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-medium">
                        {tag.postCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {tag.eventCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(tag.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {tag.isActive ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditDialog({ open: true, tag: { ...tag } })}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteTag(tag._id, tag.name)}
                              className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreTag(tag._id)}
                            className="hover:bg-green-50 hover:border-green-200 hover:text-green-600"
                          >
                            重新启用
                          </Button>
                        )}
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              共 {data.pagination.total} 条记录
            </div>
            <PaginationBar
              currentPage={currentPage}
              totalPages={data.pagination.pages}
              onPageChange={setCurrentPage}
              totalCount={data.pagination.total}
              pageSize={20}
              ariaLabel="标签管理分页"
            />
          </div>
        </CardContent>
      </Card>

      {/* 添加标签对话框 */}
      <AlertDialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5 text-primary" />
              <span>添加新标签</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              创建一个新的内容标签，用于分类和组织内容
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">标签名称</label>
              <Input
                value={newTag.name}
                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                placeholder="输入标签名称"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              <Input
                value={newTag.description}
                onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                placeholder="输入标签描述（可选）"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">颜色</label>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-8 h-8 rounded border shadow-sm"
                  style={{ backgroundColor: newTag.color }}
                />
                <Input
                  type="color"
                  value={newTag.color}
                  onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                  className="w-20"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTag({ ...newTag, color })}
                    className="w-6 h-6 rounded border hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddTag}>添加</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑标签对话框 */}
      <AlertDialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, tag: null })}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-primary" />
              <span>编辑标签</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              修改标签信息，更改将同步到所有使用该标签的内容
            </AlertDialogDescription>
          </AlertDialogHeader>
          {editDialog.tag && (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">标签名称</label>
                  <Input
                    value={editDialog.tag.name}
                    onChange={(e) => setEditDialog({ ...editDialog, tag: { ...editDialog.tag!, name: e.target.value } })}
                    placeholder="输入标签名称"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">描述</label>
                  <Input
                    value={editDialog.tag.description || ""}
                    onChange={(e) => setEditDialog({ ...editDialog, tag: { ...editDialog.tag!, description: e.target.value } })}
                    placeholder="输入标签描述（可选）"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">颜色</label>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-8 h-8 rounded border shadow-sm"
                      style={{ backgroundColor: editDialog.tag.color || "#3b82f6" }}
                    />
                    <Input
                      type="color"
                      value={editDialog.tag.color || "#3b82f6"}
                      onChange={(e) => setEditDialog({ ...editDialog, tag: { ...editDialog.tag!, color: e.target.value } })}
                      className="w-20"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditDialog({ ...editDialog, tag: { ...editDialog.tag!, color } })}
                        className="w-6 h-6 rounded border hover:scale-110 transition-transform shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleEditTag}>保存</AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              <span>确认删除</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除标签 &ldquo;{deleteDialog.tagName}&rdquo; 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTag} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}