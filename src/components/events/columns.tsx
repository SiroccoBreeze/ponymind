"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import UserAvatar from "@/components/UserAvatar"
import ImagePreview from "@/components/ui/ImagePreview"

export type EventItem = {
  _id: string
  title: string
  description?: string
  tags?: string[]
  status?: 'planned' | 'in-progress' | 'done' | 'canceled'
  occurredAt: string
  attachments?: Array<{ _id: string; originalName: string; url: string; size: number; mimetype: string }>
  creator?: { _id: string; name: string; avatar?: string; email?: string }
}

export const columns: ColumnDef<EventItem>[] = [
  {
    accessorKey: "occurredAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          时间
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const occurredAt = row.getValue("occurredAt") as string
      const creator = row.original.creator
      
      return (
        <div className="flex items-center gap-2">
          <div className="text-nowrap">
            {occurredAt.replace('T', ' ').replace('.000Z', '').replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3')}
          </div>
          {creator && (
            <div className="flex items-center gap-2">
              <UserAvatar 
                avatar={creator.avatar} 
                userName={creator.name || creator.email || '用户'} 
                size="sm" 
              />
              <span className="text-xs text-muted-foreground">
                {creator.name || creator.email}
              </span>
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "title",
    header: "标题",
    cell: ({ row }) => {
      const title = row.getValue("title") as string
      const eventId = row.original._id
      
      return (
        <button
          onClick={() => window.open(`/events/${eventId}`, '_blank')}
          className="text-left text-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
        >
          {title}
        </button>
      )
    },
  },
  {
    accessorKey: "tags",
    header: "标签",
    cell: ({ row }) => {
      const tags = row.getValue("tags") as string[]
      
      if (!tags || tags.length === 0) {
        return <span className="text-xs text-muted-foreground">—</span>
      }
      
      return (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <Badge key={tag} variant="outline" className="capitalize">
              {tag}
            </Badge>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: "attachments",
    header: "附件",
    cell: ({ row }) => {
      const attachments = row.original.attachments
      
      if (!attachments || attachments.length === 0) {
        return <span className="text-xs text-muted-foreground">—</span>
      }
      
      return (
        <div className="flex flex-wrap gap-2">
          {attachments.map(att => (
            <div key={att._id}>
              {att.mimetype?.startsWith('image/') ? (
                <ImagePreview 
                  src={att.url} 
                  alt={att.originalName} 
                  size="sm"
                  className="cursor-pointer"
                />
              ) : (
                <a 
                  href={att.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title={att.originalName}
                >
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs hover:bg-accent">
                    {att.originalName}
                  </span>
                </a>
              )}
            </div>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: "description",
    header: "描述",
    cell: ({ row }) => {
      const description = row.getValue("description") as string
      
      if (!description) {
        return <span className="text-xs text-muted-foreground">—</span>
      }
      
      return (
        <div className="max-w-xs truncate text-muted-foreground">
          {description}
        </div>
      )
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const event = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">打开菜单</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>操作</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => window.open(`/events/${event._id}`, '_blank')}
            >
              查看详情
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                try {
                  // 优先使用现代 Clipboard API
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(event._id);
                  } else {
                    // 降级到传统方法
                    const textArea = document.createElement('textarea');
                    textArea.value = event._id;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                  }
                } catch (error) {
                  console.error('复制失败:', error);
                }
              }}
            >
              复制事件ID
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
