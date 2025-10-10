"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns, EventItem } from "./columns"

interface EventsDataTableProps {
  events: EventItem[]
  loading?: boolean
}

export function EventsDataTable({ events, loading = false }: EventsDataTableProps) {
  console.log('EventsDataTable 渲染:', { events, loading, eventsLength: events?.length })
  
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

  if (!events || events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">暂无事件数据</p>
          <p className="text-xs text-muted-foreground">事件数量: {events?.length || 0}</p>
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
