'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Link2,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Clock,
  Eye,
  FileText,
  Loader2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { displayLocalTime } from '@/lib/frontend-time-utils';
import { PaginationBar } from '@/components/PaginationBar';

interface ShareLinkItem {
  _id: string;
  token: string;
  postId: { _id: string; title: string; type: string } | null;
  ttlDays: number;
  expiresAt: string;
  accessCount: number;
  isRevoked: boolean;
  createdAt: string;
  createdBy?: { name: string; email: string };
}

function getShareUrl(token: string) {
  return typeof window !== 'undefined' ? `${window.location.origin}/share/${token}` : '';
}

function isExpiredOrRevoked(link: ShareLinkItem) {
  return link.isRevoked || new Date(link.expiresAt) < new Date();
}

export default function ShareLinksManagement() {
  const [data, setData] = useState<{
    links: ShareLinkItem[];
    pagination: { page: number; limit: number; total: number; pages: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/share-links?${params}`);
      const json = await res.json();
      if (res.ok) setData(json);
      else toast.error(json.error || '加载失败');
    } catch {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [page, search]);

  const handleRevoke = async (token: string) => {
    setRevoking(token);
    try {
      const res = await fetch(`/api/admin/share-links/${token}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok) {
        toast.success('已撤销');
        fetchLinks();
      } else toast.error(json.error || '撤销失败');
    } catch {
      toast.error('网络错误');
    } finally {
      setRevoking(null);
    }
  };

  const handleCopy = async (token: string) => {
    const url = getShareUrl(token);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(token);
    toast.success('链接已复制');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">分享链接管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          管理所有临时分享链接，支持复制、撤销
        </p>
      </div>

      {/* 搜索 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="按文章标题搜索..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setSearch(searchInput)}
          className="rounded-lg shrink-0"
        >
          搜索
        </Button>
      </div>

      {/* 列表 */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !data?.links?.length ? (
          <div className="py-16 text-center text-muted-foreground">
            <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无分享链接</p>
            <p className="text-sm mt-1">
              在 <Link href="/admin/posts" className="text-primary hover:underline">内容管理</Link> 中为文章生成分享链接
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-foreground">关联内容</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground">有效期</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground">状态</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground">访问</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground">创建时间</th>
                    <th className="text-right px-4 py-3 font-medium text-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.links.map((link) => {
                    const post = link.postId;
                    const inactive = isExpiredOrRevoked(link);
                    return (
                      <tr
                        key={link._id}
                        className={`border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors ${inactive ? 'opacity-60' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            {post ? (
                              <Link
                                href={`/posts/${post._id}`}
                                target="_blank"
                                className="text-foreground hover:text-primary hover:underline line-clamp-1 max-w-[240px]"
                              >
                                {post.title}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">内容已删除</span>
                            )}
                            {post?.type === 'question' && (
                              <Badge variant="outline" className="text-xs shrink-0">问题</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {link.ttlDays} 天
                          </span>
                          <span className="block text-xs mt-0.5">
                            至 {displayLocalTime(link.expiresAt, 'date')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {link.isRevoked ? (
                            <Badge variant="outline" className="text-muted-foreground">已撤销</Badge>
                          ) : new Date(link.expiresAt) < new Date() ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">已过期</Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              有效
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Eye className="w-3.5 h-3.5" />
                            {link.accessCount} 次
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {displayLocalTime(link.createdAt, 'datetime')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!inactive && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(link.token)}
                                  className="h-8 px-2 rounded-lg"
                                >
                                  {copied === link.token ? (
                                    <Check className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="h-8 px-2 rounded-lg"
                                >
                                  <a href={getShareUrl(link.token)} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevoke(link.token)}
                                  disabled={revoking === link.token}
                                  className="h-8 px-2 rounded-lg text-destructive hover:bg-destructive/10"
                                >
                                  {revoking === link.token ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {data.pagination.pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/20">
                <span className="text-sm text-muted-foreground text-center sm:text-left">
                  共 {data.pagination.total} 条
                </span>
                <PaginationBar
                  currentPage={page}
                  totalPages={data.pagination.pages}
                  onPageChange={setPage}
                  totalCount={data.pagination.total}
                  pageSize={data.pagination.limit ?? 20}
                  ariaLabel="分享链接分页"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
