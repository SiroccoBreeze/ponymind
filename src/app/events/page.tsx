'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import EventCreateDialog from '@/components/events/EventCreateDialog'
import UserAvatar from '@/components/UserAvatar'
import ImagePreview from '@/components/ui/ImagePreview'

type EventItem = {
  _id: string
  title: string
  description?: string
  category?: string
  status?: 'planned' | 'in-progress' | 'done' | 'canceled'
  occurredAt: string
  attachments?: Array<{ _id: string; originalName: string; url: string; size: number; mimetype: string }>
  creator?: { _id: string; name: string; avatar?: string; email?: string }
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [isMounted, setIsMounted] = useState<boolean>(true)
  // 表单已移动到组件 EventCreateDialog 中

  async function fetchEvents(signal?: AbortSignal) {
    try {
      if (!isMounted) return
      setLoading(true)
      const res = await fetch('/api/events', { signal })
      const json = await res.json()
      if (json?.success && isMounted) {
        setEvents(json.data)
      }
    } catch (error) {
      // 忽略 AbortError，这是正常的组件卸载行为
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      // 检查是否是 DOMException 类型的 AbortError
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      if (isMounted) {
        console.error('获取事件列表失败:', error)
      }
    } finally {
      if (isMounted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchEvents(controller.signal)
    return () => {
      setIsMounted(false)
      controller.abort()
    }
  }, [])

  const groupedByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>()
    for (const e of events) {
      const key = format(new Date(e.occurredAt), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [events])

  // 创建动作由子组件完成，创建成功回调刷新列表
  const onCreated = useCallback(() => {
    if (isMounted) {
      fetchEvents()
    }
  }, [isMounted])

  function StatusBadge({ status }: { status: EventItem['status'] }) {
    const styles: Record<string, string> = {
      planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'in-progress': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      done: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      canceled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    }
    return <Badge className={cn('capitalize', styles[status ?? 'planned'])}>{status}</Badge>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">事件中心</h1>
        <EventCreateDialog onCreated={onCreated} />
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">二维表</TabsTrigger>
          <TabsTrigger value="timeline">时间轴</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>附件</TableHead>
                  <TableHead className="w-[40%]">描述</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">加载中...</TableCell>
                  </TableRow>
                )}
                {!loading && events.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">暂无事件</TableCell>
                  </TableRow>
                )}
                {events.map((e) => (
                  <TableRow key={e._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-nowrap">{format(new Date(e.occurredAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</div>
                        {e.creator && (
                          <div className="flex items-center gap-2">
                            <UserAvatar avatar={e.creator.avatar} userName={e.creator.name || e.creator.email || '用户'} size="sm" />
                            <span className="text-xs text-muted-foreground">{e.creator.name || e.creator.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                                         <TableCell className="font-medium">
                       <button
                         onClick={() => window.open(`/events/${e._id}`, '_blank')}
                         className="text-left hover:text-primary hover:underline cursor-pointer transition-colors"
                       >
                         {e.title}
                       </button>
                     </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{e.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.attachments && e.attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {e.attachments.map(att => (
                            <div key={att._id}>
                              {att.mimetype?.startsWith('image/') ? (
                                <ImagePreview 
                                  src={att.url} 
                                  alt={att.originalName} 
                                  size="sm"
                                  className="cursor-pointer"
                                />
                              ) : (
                                <a href={att.url} target="_blank" rel="noreferrer" title={att.originalName}>
                                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] hover:bg-accent">
                                    {att.originalName}
                                  </span>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="space-y-1">
                        {e.description}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>最近事件</TableCaption>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-10">
              {groupedByDate.map(([date, items]) => (
                <div key={date}>
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 rounded-full bg-primary mr-2" />
                    <h3 className="text-sm font-semibold text-muted-foreground">{date}</h3>
                  </div>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item._id} className="ml-6 p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {item.creator && (
                              <>
                                <UserAvatar avatar={item.creator.avatar} userName={item.creator.name || item.creator.email || '用户'} size="sm" />
                                <span className="text-xs text-muted-foreground">{item.creator.name || item.creator.email}</span>
                              </>
                            )}
                                                         <button
                               onClick={() => window.open(`/events/${item._id}`, '_blank')}
                               className="font-medium hover:text-primary hover:underline cursor-pointer transition-colors text-left"
                             >
                               {item.title}
                             </button>
                          </div>
                          <div className="text-xs text-muted-foreground">{format(new Date(item.occurredAt), 'HH:mm')}</div>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{item.category}</Badge>
                        </div>
                        {item.description && (
                          <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                        )}
                        {item.attachments && item.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.attachments.map(att => (
                              <div key={att._id}>
                                {att.mimetype?.startsWith('image/') ? (
                                  <ImagePreview 
                                    src={att.url} 
                                    alt={att.originalName} 
                                    size="md"
                                    className="cursor-pointer"
                                  />
                                ) : (
                                  <a href={att.url} target="_blank" rel="noreferrer" title={att.originalName}>
                                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] hover:bg-accent">
                                      {att.originalName}
                                    </span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!loading && events.length === 0 && (
                <div className="text-center text-sm text-muted-foreground">暂无事件</div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

