"use client";

import { useEffect, useState } from "react";
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

interface Tag {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  postCount: number;
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
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; tagId?: string; tagName?: string }>({ open: false });
  const [updating, setUpdating] = useState<string | null>(null);

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
      } else {
        const error = await response.json();
        alert(error.error || "添加失败");
      }
    } catch (error) {
      console.error("添加标签失败:", error);
      alert("添加失败");
    }
  };

  const handleEditTag = async () => {
    if (!editDialog.tag) return;
    try {
      const response = await fetch("/api/admin/tags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagId: editDialog.tag._id,
          name: editDialog.tag.name,
          description: editDialog.tag.description,
          color: editDialog.tag.color,
        }),
      });
      if (response.ok) {
        setEditDialog({ open: false, tag: null });
        await fetchTags();
      } else {
        const error = await response.json();
        alert(error.error || "更新失败");
      }
    } catch (error) {
      console.error("更新标签失败:", error);
      alert("更新失败");
    }
  };

  const handleDeleteTag = (tagId: string, tagName: string) => {
    setDeleteDialog({ open: true, tagId, tagName });
  };

  const confirmDeleteTag = async () => {
    if (!deleteDialog.tagId) return;
    setUpdating(deleteDialog.tagId);
    try {
      const response = await fetch(`/api/admin/tags?tagId=${deleteDialog.tagId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchTags();
      } else {
        const error = await response.json();
        alert(error.error || "删除失败");
      }
    } catch (error) {
      console.error("删除标签失败:", error);
      alert("删除失败");
    } finally {
      setUpdating(null);
      setDeleteDialog({ open: false });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">加载数据失败</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和统计 */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">标签管理</h1>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <p className="text-sm text-gray-600">总标签数</p>
              <p className="text-2xl font-bold text-gray-900">{data.stats.totalTags}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <p className="text-sm text-gray-600">活跃标签</p>
              <p className="text-2xl font-bold text-green-600">{data.stats.activeTags}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <p className="text-sm text-gray-600">未使用标签</p>
              <p className="text-2xl font-bold text-orange-600">{data.stats.unusedTags}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setAddDialogOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <span>+</span>
          <span>添加标签</span>
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">搜索标签</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索标签名称或描述..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      {/* 标签列表 */}
      <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
          {data.tags.map((tag) => (
            <div key={tag._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color || "#3b82f6" }}
                  ></div>
                  <h3 className="font-medium text-gray-900 truncate">{tag.name}</h3>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEditDialog({ open: true, tag })}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="编辑"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag._id, tag.name)}
                    disabled={updating === tag._id}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="删除"
                  >
                    {updating === tag._id ? (
                      <div className="w-4 h-4 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {tag.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{tag.description}</p>
              )}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{tag.postCount} 个内容</span>
                <span>{formatDate(tag.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
        {data.tags.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无标签</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      {data.pagination.pages > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <span className="px-3 py-2 text-sm text-gray-700">
              第 {currentPage} 页，共 {data.pagination.pages} 页
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(data.pagination.pages, currentPage + 1))}
              disabled={currentPage === data.pagination.pages}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 添加标签弹框 */}
      <AlertDialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>添加标签</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标签名称 *</label>
              <input
                type="text"
                value={newTag.name}
                onChange={e => setNewTag({ ...newTag, name: e.target.value })}
                placeholder="输入标签名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标签描述</label>
              <textarea
                value={newTag.description}
                onChange={e => setNewTag({ ...newTag, description: e.target.value })}
                placeholder="输入标签描述（可选）"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标签颜色</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTag({ ...newTag, color })}
                    className={`w-8 h-8 rounded-full border-2 ${newTag.color === color ? "border-gray-800" : "border-gray-300"}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={newTag.color}
                onChange={e => setNewTag({ ...newTag, color: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAddDialogOpen(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddTag}>添加</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑标签弹框 */}
      <AlertDialog open={editDialog.open} onOpenChange={open => setEditDialog(v => ({ ...v, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>编辑标签</AlertDialogTitle>
          </AlertDialogHeader>
          {editDialog.tag && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">标签名称 *</label>
                <input
                  type="text"
                  value={editDialog.tag.name}
                  onChange={e => setEditDialog(v => ({ ...v, tag: { ...v.tag!, name: e.target.value } }))}
                  placeholder="输入标签名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">标签描述</label>
                <textarea
                  value={editDialog.tag.description || ""}
                  onChange={e => setEditDialog(v => ({ ...v, tag: { ...v.tag!, description: e.target.value } }))}
                  placeholder="输入标签描述（可选）"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">标签颜色</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {predefinedColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditDialog(v => ({ ...v, tag: { ...v.tag!, color } }))}
                      className={`w-8 h-8 rounded-full border-2 ${editDialog.tag?.color === color ? "border-gray-800" : "border-gray-300"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={editDialog.tag?.color || "#3b82f6"}
                  onChange={e => setEditDialog(v => ({ ...v, tag: { ...v.tag!, color: e.target.value } }))}
                  className="w-full h-10 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditDialog({ open: false, tag: null })}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditTag}>保存</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除标签弹框 */}
      <AlertDialog open={deleteDialog.open} onOpenChange={open => setDeleteDialog(v => ({ ...v, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除标签“{deleteDialog.tagName}”吗？</AlertDialogTitle>
            <AlertDialogDescription>此操作不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialog({ open: false })}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTag} disabled={!!updating}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}