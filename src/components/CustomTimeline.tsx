'use client'

import React from 'react'
import { Calendar, Clock, User, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface TimelineItemProps {
  id: string
  title: string
  description?: string
  date: string
  tags?: string[]
  creator?: {
    _id: string
    name: string
    avatar?: string
    email?: string
  }
  attachments?: Array<{
    _id: string
    originalName: string
    url: string
    size: number
    mimetype: string
  }>
  onClick?: () => void
}

interface CustomTimelineProps {
  items: TimelineItemProps[]
  className?: string
}

const TimelineItem: React.FC<{ item: TimelineItemProps; isLast: boolean }> = ({ item, isLast }) => {
  return (
    <div className="relative flex gap-4 md:gap-6 pb-8 group">
      {/* 时间轴线条 */}
      <div className="relative flex flex-col items-center flex-shrink-0">
        {/* 时间轴图标 */}
        <div className="relative z-10 flex items-center justify-center w-10 h-10 bg-primary rounded-full border-4 border-background shadow-sm ring-8 ring-background transition-all duration-200 group-hover:scale-110 group-hover:shadow-md">
          <Calendar className="w-4 h-4 text-primary-foreground" />
        </div>
        
        {/* 连接线 */}
        {!isLast && (
          <div className="w-px h-full bg-border absolute top-10 left-1/2 -translate-x-1/2" />
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 min-w-0">
        {/* 时间标签 */}
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <time className="text-sm font-medium text-muted-foreground">
            {item.date}
          </time>
        </div>

        {/* 内容卡片 */}
        <Card 
          className={cn(
            "relative transition-all duration-200 border-l-4 border-l-primary hover:shadow-md",
            item.onClick && "cursor-pointer hover:shadow-lg hover:border-l-primary/80"
          )}
          onClick={item.onClick}
        >
          <CardContent className="p-4 md:p-5">
            {/* 标题和标签行 */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-3">
              <h3 
                className={cn(
                  "font-semibold text-foreground leading-tight text-base md:text-lg",
                  item.onClick && "hover:text-primary transition-colors"
                )}
              >
                {item.title}
              </h3>
              
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 flex-shrink-0">
                  {item.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* 描述内容 */}
            {item.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {item.description}
              </p>
            )}
            
            {/* 底部元信息 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-sm">
              {/* 创建者信息 */}
              {item.creator && (
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6 flex-shrink-0">
                    <AvatarImage src={item.creator.avatar} alt={item.creator.name || item.creator.email} />
                    <AvatarFallback className="text-xs bg-muted">
                      <User className="w-3 h-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground font-medium truncate">
                    {item.creator.name || item.creator.email}
                  </span>
                </div>
              )}
              
              {/* 附件信息 */}
              {item.attachments && item.attachments.length > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Paperclip className="w-3 h-3 flex-shrink-0" />
                  <span className="text-xs font-medium">
                    {item.attachments.length} 个附件
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const CustomTimeline: React.FC<CustomTimelineProps> = ({ items, className }) => {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">暂无事件</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          还没有任何事件记录。创建第一个事件来开始记录重要时刻吧！
        </p>
      </div>
    )
  }

  return (
    <div className={cn("relative space-y-0", className)}>
      <div className="relative">
        {items.map((item, index) => (
          <TimelineItem
            key={item.id}
            item={item}
            isLast={index === items.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

export default CustomTimeline
