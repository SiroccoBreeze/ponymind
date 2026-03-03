"use client"

import { DataTable } from "@/components/ui/data-table"
import { createColumns, EventItem } from "./columns"

interface EventsDataTableProps {
  events: EventItem[]
  loading?: boolean
  onEdit?: (event: EventItem) => void
}

export function EventsDataTable({ events, loading = false, onEdit }: EventsDataTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">暂无事件数据</p>
      </div>
    )
  }

  const columnLabels = {
    occurredAt: "时间",
    title: "标题",
    tags: "标签",
    attachments: "附件",
    description: "描述",
    actions: "操作",
  }

  return (
    <DataTable
      columns={createColumns(onEdit)}
      data={events}
      searchKey="title"
      searchPlaceholder="搜索事件标题..."
      showColumnToggle={true}
      showPagination={true}
      pageSize={10}
      columnLabels={columnLabels}
    />
  )
}
