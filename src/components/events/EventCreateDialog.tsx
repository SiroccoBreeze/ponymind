"use client"

import React, { useState, useRef, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import ImagePreview from '@/components/ui/ImagePreview'

type Uploaded = { id: string; originalName: string; url: string; size: number; mimetype: string }

export default function EventCreateDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'change' | 'release' | 'other'>('other')
  const [occurredAt, setOccurredAt] = useState('')
  const [attachments, setAttachments] = useState<Uploaded[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const canSave = useMemo(() => !!title && !!occurredAt && !uploading, [title, occurredAt, uploading])

  const onDrop = useCallback(async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // 创建新的AbortController
    abortControllerRef.current = new AbortController()
    
    setUploading(true)
    setUploadProgress(0)
    setUploadError(null)
    
    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }
    
    try {
      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      })
      
      if (!response.ok) {
        throw new Error(`上传失败: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setAttachments(prev => [...prev, ...result.attachments])
        setUploadProgress(100)
        
        // 显示成功消息
        if (result.message) {
          console.log(result.message)
        }
        
        // 显示警告信息
        if (result.errors && result.errors.length > 0) {
          console.warn('部分文件上传失败:', result.errors)
        }
      } else {
        throw new Error(result.error || '上传失败')
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('上传已取消')
        return
      }
      
      console.error('上传失败:', error)
      setUploadError(error instanceof Error ? error.message : '上传失败')
    } finally {
      setUploading(false)
      abortControllerRef.current = null
    }
  }, [])

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          occurredAt,
          attachmentIds: attachments.map((a) => a.id),
        }),
      })
      
      if (!response.ok) {
        throw new Error(`保存失败: ${response.status}`)
      }
      
      setOpen(false)
      setTitle('')
      setDescription('')
      setCategory('other')
      setOccurredAt('')
      setAttachments([])
      onCreated?.()
    } catch (error) {
      console.error('保存失败:', error)
      // 这里可以添加错误提示UI
    } finally {
      setSaving(false)
    }
  }

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => onDrop(e.target.files)

  // 清理函数
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // 组件卸载时清理
  React.useEffect(() => {
    return cleanup
  }, [cleanup])

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) {
        cleanup() // 关闭对话框时清理
      }
      setOpen(v)
      if (v && !occurredAt) {
        const now = new Date()
        const pad = (n: number) => `${n}`.padStart(2, '0')
        const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
        setOccurredAt(local)
      }
    }}>
      <DialogTrigger asChild>
        <Button>新增事件</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新增事件</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm">标题</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：服务上线 v1.2.0" />
          </div>
          <div>
            <label className="block mb-2 text-sm">描述</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-2 text-sm">分类</label>
              <Select value={category} onValueChange={(v: 'change' | 'release' | 'other') => setCategory(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="change">变更</SelectItem>
                  <SelectItem value="release">上线</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block mb-2 text-sm">创建时间</label>
              <Input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block mb-2 text-sm">附件</label>
            <div
              className="rounded-md border border-dashed p-4 text-center hover:bg-accent/50 transition-colors"
              onDragOver={(e) => {
                e.preventDefault()
              }}
              onDrop={(e) => {
                e.preventDefault()
                onDrop(e.dataTransfer.files)
              }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              aria-label="上传附件"
            >
              <div className="text-sm text-muted-foreground">
                点击或拖拽文件到此处上传（支持多文件，单个≤20MB）
              </div>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFileInput} />
            </div>
            
            {/* 上传进度和错误提示 */}
            {uploading && (
              <div className="mt-3">
                <Progress value={uploadProgress} />
                <div className="text-xs text-muted-foreground mt-1">正在上传 {uploadProgress}%</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={cleanup}
                >
                  取消上传
                </Button>
              </div>
            )}
            
            {uploadError && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="text-sm text-destructive">{uploadError}</div>
              </div>
            )}
            
            {attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachments.map((a) => {
                  const isImage = a.mimetype?.startsWith('image/')
                  return (
                    <div key={a.id} className="group relative">
                      {isImage ? (
                        <ImagePreview 
                          src={a.url} 
                          alt={a.originalName} 
                          size="md"
                          className="cursor-pointer"
                        />
                      ) : (
                        <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:bg-accent">
                          <span className="max-w-[160px] truncate" title={a.originalName}>{a.originalName}</span>
                        </a>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeAttachment(a.id)}
                      >
                        移除
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

