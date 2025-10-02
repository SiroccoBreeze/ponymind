'use client'

import React, { useState } from 'react'
import { Calendar, Clock, User, Paperclip, MoreHorizontal, CalendarDays, CalendarRange } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type TimelineMode = 'year' | 'month' | 'day'

interface TimelineItemProps {
  id: string
  title: string
  description?: string
  date: string
  originalDate?: string // 用于分组的原始日期
  tags?: string[]
  creator?: {
    _id: string
    name: string
    avatar?: string
    email?: string
  }
  userGroup?: {
    _id: string
    name: string
    color: string
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
  mode?: TimelineMode
  onModeChange?: (mode: TimelineMode) => void
  showModeSelector?: boolean
}

// 获取模式对应的图标
const getModeIcon = (mode: TimelineMode) => {
  switch (mode) {
    case 'year':
      return CalendarRange
    case 'month':
      return CalendarDays
    case 'day':
    default:
      return Calendar
  }
}

// 迷你事件卡片组件（用于年月模式）
const MiniEventCard: React.FC<{ item: TimelineItemProps }> = ({ item }) => {
  return (
    <div 
      className={cn(
        "group relative bg-card border rounded-lg p-2 transition-all duration-200 hover:shadow-sm hover:border-primary/50",
        item.onClick && "cursor-pointer"
      )}
      onClick={item.onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className={cn(
          "font-medium text-sm text-foreground leading-tight truncate flex-1",
          item.onClick && "group-hover:text-primary transition-colors"
        )}>
          {item.title}
        </h4>
        <div className="flex items-center gap-1 flex-shrink-0">
          {item.userGroup && (
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: item.userGroup.color }}
              title={item.userGroup.name}
            />
          )}
          {item.tags && item.tags.length > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
              {item.tags[0]}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-1">
        <time className="text-xs text-muted-foreground">
          {item.date}
        </time>
        {(item.attachments && item.attachments.length > 0) && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Paperclip className="w-2.5 h-2.5" />
            <span className="text-xs">{item.attachments.length}</span>
          </div>
        )}
      </div>
    </div>
  )
}

const TimelineItem: React.FC<{ 
  item: TimelineItemProps; 
  isLast: boolean; 
  mode: TimelineMode 
}> = ({ item, isLast, mode }) => {
  const isCompact = mode === 'year' || mode === 'month'
  
  // 如果是紧凑模式，使用迷你卡片
  if (isCompact) {
    return (
      <div className="relative flex gap-3 pb-3 group">
        {/* 简化的时间轴线条 */}
        <div className="relative flex flex-col items-center flex-shrink-0">
          {/* 小圆点 */}
          <div className="relative z-10 w-2 h-2 bg-primary rounded-full transition-all duration-200 group-hover:scale-125" />
          
          {/* 连接线 */}
          {!isLast && (
            <div className="w-px h-full bg-border absolute top-2 left-1/2 -translate-x-1/2" />
          )}
        </div>

        {/* 迷你事件卡片 */}
        <div className="flex-1 min-w-0">
          <MiniEventCard item={item} />
        </div>
      </div>
    )
  }

  // 日模式使用原来的完整布局
  const IconComponent = getModeIcon(mode)
  
  return (
    <div className="relative flex gap-4 md:gap-6 pb-8 group">
      {/* 时间轴线条 */}
      <div className="relative flex flex-col items-center flex-shrink-0">
        {/* 时间轴图标 */}
        <div className="relative z-10 flex items-center justify-center w-10 h-10 bg-primary rounded-full border-4 border-background shadow-sm ring-8 ring-background transition-all duration-200 group-hover:scale-110 group-hover:shadow-md">
          <IconComponent className="w-4 h-4 text-primary-foreground" />
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
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
                
                {/* 用户组信息 */}
                {item.userGroup && (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: item.userGroup.color }}
                    />
                    <span className="text-muted-foreground text-xs font-medium">
                      {item.userGroup.name}
                    </span>
                  </div>
                )}
              </div>
              
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

// 时间段分组组件
const TimelineGroup: React.FC<{
  title: string
  items: TimelineItemProps[]
  mode: TimelineMode
  isLast: boolean
}> = ({ title, items, mode, isLast }) => {
  const IconComponent = getModeIcon(mode)
  
  return (
    <div className="relative flex gap-3 pb-6 group">
      {/* 时间段标题轴 */}
      <div className="relative flex flex-col items-center flex-shrink-0">
        {/* 时间段图标 */}
        <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-primary rounded-full border-2 border-background shadow-sm transition-all duration-200">
          <IconComponent className="w-4 h-4 text-primary-foreground" />
        </div>
        
        {/* 连接线 */}
        {!isLast && (
          <div className="w-px h-full bg-border absolute top-8 left-1/2 -translate-x-1/2" />
        )}
      </div>

      {/* 时间段内容 */}
      <div className="flex-1 min-w-0">
        {/* 时间段标题和事件统计 */}
        <div className="flex items-center justify-between mb-4 mt-1">
          <h3 className="font-semibold text-lg text-foreground">
            {title}
          </h3>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {items.length} 个事件
          </Badge>
        </div>
        
        {/* 事件列表 - 年模式不显示，月模式显示 */}
        {mode === 'month' && (
          <div className="space-y-2 ml-4 border-l-2 border-border pl-4">
            {items.map((item, index) => (
              <TimelineItem
                key={item.id}
                item={item}
                isLast={index === items.length - 1}
                mode={mode}
              />
            ))}
          </div>
        )}
        
                 {/* 年模式：只显示事件总数卡片 */}
         {mode === 'year' && (
           <div className="ml-4 border-l-2 border-border pl-4">
             <Card className="relative transition-all duration-200 border-l-2 border-l-primary hover:shadow-md bg-muted/30">
               <CardContent className="p-4 text-center">
                 <div className="flex flex-col items-center gap-2">
                   <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                     <Calendar className="w-6 h-6 text-primary" />
                   </div>
                   <div>
                     <p className="text-2xl font-bold text-foreground">
                       {items.length}
                     </p>
                     <p className="text-sm text-muted-foreground">
                       个事件
                     </p>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </div>
         )}
      </div>
    </div>
  )
}

const CustomTimeline: React.FC<CustomTimelineProps> = ({ 
  items, 
  className, 
  mode: externalMode, 
  onModeChange,
  showModeSelector = true 
}) => {
  const [internalMode, setInternalMode] = useState<TimelineMode>('day')
  const currentMode = externalMode || internalMode
  
  const handleModeChange = (newMode: TimelineMode) => {
    if (onModeChange) {
      onModeChange(newMode)
    } else {
      setInternalMode(newMode)
    }
  }
  
  // 根据模式分组事件
  const groupedItems = React.useMemo(() => {
    if (currentMode === 'day') {
      return null // 日模式不分组
    }
    
    const groups = new Map<string, TimelineItemProps[]>()
    
    items.forEach(item => {
      // 使用originalDate进行分组，如果没有则使用date
      const dateStr = item.originalDate || item.date
      const date = new Date(dateStr)
      
      let groupKey: string
      
      if (currentMode === 'year') {
        groupKey = date.getFullYear().toString()
      } else { // month
        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(item)
    })
    
    // 转换为数组并排序
    return Array.from(groups.entries())
      .map(([key, items]) => ({
        key,
        title: currentMode === 'year' 
          ? `${key}年` 
          : `${key.split('-')[0]}年${key.split('-')[1]}月`,
        items: items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }))
      .sort((a, b) => b.key.localeCompare(a.key))
  }, [items, currentMode])
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
      {/* 模式选择器 */}
      {showModeSelector && (
        <div className="flex justify-center mb-6">
          <Tabs value={currentMode} onValueChange={(value) => handleModeChange(value as TimelineMode)}>
            <TabsList className="grid w-fit grid-cols-3">
              <TabsTrigger value="year" className="text-xs px-3">年</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-3">月</TabsTrigger>
              <TabsTrigger value="day" className="text-xs px-3">日</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
      
      {/* 时间轴内容 */}
      <div className="relative">
        {groupedItems ? (
          // 分组模式（年/月）
          groupedItems.map((group, index) => (
            <TimelineGroup
              key={group.key}
              title={group.title}
              items={group.items}
              mode={currentMode}
              isLast={index === groupedItems.length - 1}
            />
          ))
        ) : (
          // 日模式（不分组）
          items
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((item, index) => (
              <TimelineItem
                key={item.id}
                item={item}
                isLast={index === items.length - 1}
                mode={currentMode}
              />
            ))
        )}
      </div>
    </div>
  )
}

export default CustomTimeline
