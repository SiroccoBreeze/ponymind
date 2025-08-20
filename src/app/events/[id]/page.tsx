'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { ArrowLeft, Calendar, FileText } from 'lucide-react'
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">加载失败</h2>
          <p className="text-muted-foreground mb-6">{error || '事件不存在或已被删除'}</p>
          <Button onClick={() => router.push('/events')}>
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
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* 返回按钮 */}
      <div className="mb-4">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/events')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回事件列表
        </Button>
      </div>

      {/* 事件详情卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{event.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                                     {event.occurredAt.replace('T', ' ').replace('.000Z', '').replace(/(\d{4})-(\d{2})-(\d{2})/, '$1年$2月$3日')}
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
              {/* 标签显示 */}
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {event.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="capitalize">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">


          {/* 描述 */}
          {event.description && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2">事件描述</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            </>
          )}

          {/* 附件 */}
          {event.attachments && event.attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  附件 ({event.attachments.length})
                </h3>
                <div className="flex flex-wrap gap-3">
                  {event.attachments.map((att) => (
                    <div key={att._id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors bg-card">
                      {att.mimetype?.startsWith('image/') ? (
                        <ImagePreview 
                          src={att.url} 
                          alt={att.originalName} 
                          size="sm"
                          className="cursor-pointer flex-shrink-0"
                        />
                      ) : (
                        <a href={att.url} target="_blank" rel="noreferrer" title={att.originalName} className="flex-shrink-0">
                          <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs hover:bg-accent bg-muted">
                            {att.originalName}
                          </span>
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