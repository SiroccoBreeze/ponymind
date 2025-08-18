"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns, EventItem } from "./columns"

interface EventsDataTableProps {
  events: EventItem[]
  loading?: boolean
}

export function EventsDataTable({ events, loading = false }: EventsDataTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
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
      columns={columns}
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
