'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  Copy,
  Check,
  Trash2,
  Loader2,
  Link2,
  PlusCircle,
  Eye,
} from 'lucide-react';
import { displayLocalTime } from '@/lib/frontend-time-utils';

interface ShareLink {
  _id: string;
  token: string;
  ttlDays: 1 | 3 | 7;
  expiresAt: string;
  accessCount: number;
  isRevoked: boolean;
  createdAt: string;
}

interface ShareLinkDialogProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
}

const TTL_OPTIONS: { days: 1 | 3 | 7; label: string; desc: string }[] = [
  { days: 1, label: '1 天', desc: '明天到期' },
  { days: 3, label: '3 天', desc: '三天内有效' },
  { days: 7, label: '7 天', desc: '一周内有效' },
];

function getShareUrl(token: string) {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/share/${token}`;
}

function isExpiredOrRevoked(link: ShareLink) {
  return link.isRevoked || new Date(link.expiresAt) < new Date();
}

function StatusBadge({ link }: { link: ShareLink }) {
  if (link.isRevoked) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground border-muted">
        已撤销
      </Badge>
    );
  }
  if (new Date(link.expiresAt) < new Date()) {
    return (
      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
        已过期
      </Badge>
    );
  }
  return (
    <Badge className="text-xs bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 dark:text-emerald-400">
      有效
    </Badge>
  );
}

export default function ShareLinkDialog({
  open,
  onClose,
  postId,
  postTitle,
}: ShareLinkDialogProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedTtl, setSelectedTtl] = useState<1 | 3 | 7>(7);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/share-links?postId=${postId}`);
      const data = await res.json();
      if (res.ok) setLinks(data.links || []);
      else toast.error(data.error || '获取链接列表失败');
    } catch {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (open && postId) fetchLinks();
  }, [open, postId, fetchLinks]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/share-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, ttlDays: selectedTtl }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('分享链接已生成');
        // 将新链接插到列表头部
        setLinks((prev) => [data.shareLink, ...prev]);
      } else {
        toast.error(data.error || '生成失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (token: string) => {
    setRevoking(token);
    try {
      const res = await fetch(`/api/admin/share-links/${token}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('链接已撤销');
        setLinks((prev) =>
          prev.map((l) => (l.token === token ? { ...l, isRevoked: true } : l))
        );
      } else {
        toast.error(data.error || '撤销失败');
      }
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
    toast.success('链接已复制到剪贴板');
    setTimeout(() => setCopied(null), 2000);
  };

  const activeLinks = links.filter((l) => !isExpiredOrRevoked(l));
  const inactiveLinks = links.filter(isExpiredOrRevoked);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <Link2 className="w-5 h-5 text-primary" />
            生成临时分享链接
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground line-clamp-1">
            {postTitle}
          </DialogDescription>
        </DialogHeader>

        {/* ── 生成区域 ── */}
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            选择有效期，生成无需登录即可访问的临时链接：
          </p>

          {/* 有效期选择 */}
          <div className="grid grid-cols-3 gap-2">
            {TTL_OPTIONS.map(({ days, label, desc }) => (
              <button
                key={days}
                onClick={() => setSelectedTtl(days)}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border-2 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                  selectedTtl === days
                    ? 'border-primary bg-primary/8 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-accent'
                }`}
                aria-pressed={selectedTtl === days}
              >
                <Clock className="w-4 h-4 mb-1" />
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs opacity-70">{desc}</span>
              </button>
            ))}
          </div>

          <Button
            onClick={handleCreate}
            disabled={creating}
            className="w-full rounded-xl font-medium shadow-[0_4px_16px_rgba(58,127,245,0.20)] hover:shadow-[0_6px_24px_rgba(58,127,245,0.28)] hover:-translate-y-0.5 transition-all duration-200"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <PlusCircle className="w-4 h-4 mr-2" />
            )}
            {creating ? '生成中…' : '生成分享链接'}
          </Button>
        </div>

        <Separator className="my-4 opacity-60" />

        {/* ── 链接列表 ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center justify-between">
            <span>已创建的链接</span>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </h3>

          {!loading && links.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              暂无分享链接，点击上方按钮生成
            </div>
          )}

          {/* 有效链接 */}
          {activeLinks.map((link) => (
            <LinkCard
              key={link._id}
              link={link}
              onCopy={handleCopy}
              onRevoke={handleRevoke}
              copied={copied}
              revoking={revoking}
            />
          ))}

          {/* 已失效链接 */}
          {inactiveLinks.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground pt-1">已失效</p>
              {inactiveLinks.map((link) => (
                <LinkCard
                  key={link._id}
                  link={link}
                  onCopy={handleCopy}
                  onRevoke={handleRevoke}
                  copied={copied}
                  revoking={revoking}
                  dimmed
                />
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── 单条链接卡片 ────────────────────────────────────────────────────────────

function LinkCard({
  link,
  onCopy,
  onRevoke,
  copied,
  revoking,
  dimmed = false,
}: {
  link: ShareLink;
  onCopy: (token: string) => void;
  onRevoke: (token: string) => void;
  copied: string | null;
  revoking: string | null;
  dimmed?: boolean;
}) {
  const url = getShareUrl(link.token);
  const inactive = isExpiredOrRevoked(link);

  return (
    <div
      className={`rounded-xl border p-3 space-y-2 transition-opacity ${
        dimmed ? 'opacity-50' : 'border-border bg-card'
      }`}
    >
      {/* 状态行 */}
      <div className="flex items-center justify-between gap-2">
        <StatusBadge link={link} />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Eye className="w-3 h-3" />
          <span>{link.accessCount} 次访问</span>
          <span className="mx-1 text-border">·</span>
          <Clock className="w-3 h-3" />
          <span>
            {inactive
              ? '已过期'
              : `到期 ${displayLocalTime(link.expiresAt, 'datetime')}`}
          </span>
        </div>
      </div>

      {/* URL 展示 */}
      <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-2">
        <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
          {url}
        </span>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopy(link.token)}
          className="flex-1 rounded-lg text-xs h-8 cursor-pointer"
        >
          {copied === link.token ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              复制链接
            </>
          )}
        </Button>

        {!inactive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRevoke(link.token)}
            disabled={revoking === link.token}
            className="rounded-lg text-xs h-8 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
          >
            {revoking === link.token ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        创建于 {displayLocalTime(link.createdAt, 'datetime')} · 有效期 {link.ttlDays} 天
      </p>
    </div>
  );
}
