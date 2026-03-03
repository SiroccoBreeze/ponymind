'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { ArrowLeft, Calendar, FileText, AlertTriangle } from 'lucide-react'
import { displayLocalTime } from '@/lib/frontend-time-utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import UserAvatar from '@/components/UserAvatar'
import ImagePreview from '@/components/ui/ImagePreview'

type EventDetail = {
  _id: string
  title: string
  description?: string
  tags?: string[]
  occurredAt: string
  createdAt: string
  attachments?: Array<{ _id: string; originalName: string; url: string; size: number; mimetype: string }>
  creator?: { _id: string; name: string; avatar?: string; email?: string }
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEventDetail() {
      try {
        setLoading(true)
        const res = await fetch(`/api/events/${params.id}`)
        const json = await res.json()
        
        if (json?.success) {
          setEvent(json.data)
        } else {
          setError(json?.message || '获取事件详情失败')
        }
      } catch (error) {
        console.error('获取事件详情失败:', error)
        setError('网络错误，请稍后重试')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchEventDetail()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm p-8">
          <div className="flex justify-center mb-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive" aria-hidden>
              <AlertTriangle className="h-7 w-7" strokeWidth={1.5} />
            </span>
          </div>
          <h2 className="font-heading text-2xl font-semibold text-foreground mb-2">加载失败</h2>
          <p className="text-muted-foreground mb-6">{error || '事件不存在或已被删除'}</p>
          <Button
            onClick={() => router.push('/events')}
            variant="outline"
            className="rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
          >
            返回事件列表
          </Button>
        </div>
      </div>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/events')}
          className="gap-2 rounded-lg text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer transition-colors duration-200"
          aria-label="返回事件列表"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          返回事件列表
        </Button>
      </div>

      <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 min-w-0">
              <CardTitle className="font-heading text-2xl font-semibold text-foreground">{event.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  {displayLocalTime(event.occurredAt, 'full')}
                </div>
                <div className="flex items-center gap-2">
                  <UserAvatar
                    avatar={event.creator?.avatar}
                    userName={event.creator?.name || event.creator?.email || '未知用户'}
                    size="sm"
                  />
                  <span>{event.creator?.name || event.creator?.email || '未知用户'}</span>
                </div>
              </div>
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {event.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="capitalize rounded-full bg-muted text-muted-foreground text-xs px-2.5 py-0.5 font-medium">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-4 space-y-6">
          {event.description && (
            <>
              <Separator className="bg-border" />
              <div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">事件描述</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            </>
          )}

          {event.attachments && event.attachments.length > 0 && (
            <>
              <Separator className="bg-border" />
              <div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" strokeWidth={1.5} />
                  附件 ({event.attachments.length})
                </h3>
                <div className="flex flex-wrap gap-3">
                  {event.attachments.map((att) => (
                    <div key={att._id} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors duration-200 bg-card">
                      {att.mimetype?.startsWith('image/') ? (
                        <ImagePreview 
                          src={att.url} 
                          alt={att.originalName} 
                          size="sm"
                          className="cursor-pointer flex-shrink-0"
                        />
                      ) : (
                        <a href={att.url} target="_blank" rel="noreferrer" title={att.originalName} className="flex-shrink-0 rounded-full border border-border px-2 py-1 text-xs hover:bg-accent bg-muted transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                          {att.originalName}
                        </a>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate" title={att.originalName}>
                          {att.originalName}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{formatFileSize(att.size)}</span>
                          <span className="capitalize">{att.mimetype}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 