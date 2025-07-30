"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, X, Tag, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export interface EnhancedComboboxOption {
  value: string
  label: string
  count?: number
  description?: string
  category?: string
}

interface EnhancedComboboxProps {
  options: EnhancedComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  clearable?: boolean
  type?: 'tag' | 'author' | 'general'
  maxHeight?: number
  showCount?: boolean
  grouped?: boolean
}

export function EnhancedCombobox({
  options,
  value,
  onValueChange,
  placeholder = "选择选项...",
  searchPlaceholder = "搜索...",
  emptyMessage = "未找到选项",
  className,
  disabled = false,
  clearable = true,
  type = 'general',
  maxHeight = 300,
  showCount = true,
  grouped = false,
}: EnhancedComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  )

  // 搜索过滤逻辑优化
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options
    
    const searchLower = searchValue.toLowerCase()
    return options.filter((option) => {
      const matchLabel = option.label.toLowerCase().includes(searchLower)
      const matchValue = option.value.toLowerCase().includes(searchLower)
      const matchDescription = option.description?.toLowerCase().includes(searchLower)
      return matchLabel || matchValue || matchDescription
    })
  }, [options, searchValue])

  // 分组选项
  const groupedOptions = React.useMemo(() => {
    if (!grouped) return { '': filteredOptions }
    
    const groups: Record<string, EnhancedComboboxOption[]> = {}
    filteredOptions.forEach(option => {
      const category = option.category || '其他'
      if (!groups[category]) groups[category] = []
      groups[category].push(option)
    })
    
    return groups
  }, [filteredOptions, grouped])

  const handleSelect = (selectedValue: string) => {
    const newValue = selectedValue === value ? "" : selectedValue
    onValueChange?.(newValue)
    setOpen(false)
    setSearchValue("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange?.("")
  }

  const getIcon = () => {
    switch (type) {
      case 'tag':
        return <Tag className="h-4 w-4 opacity-50" />
      case 'author':
        return <User className="h-4 w-4 opacity-50" />
      default:
        return null
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between text-left font-normal h-10",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getIcon()}
            {selectedOption ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="truncate">{selectedOption.label}</span>
                {showCount && selectedOption.count !== undefined && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {selectedOption.count}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {clearable && value && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0" 
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 ml-2"
                onClick={() => setSearchValue("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CommandList style={{ maxHeight: `${maxHeight}px` }}>
            {filteredOptions.length === 0 ? (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </CommandEmpty>
            ) : (
              Object.entries(groupedOptions).map(([category, categoryOptions], categoryIndex) => (
                <CommandGroup key={category} heading={grouped && category ? category : undefined}>
                  {categoryOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={handleSelect}
                      className="flex items-center justify-between py-2 px-3 hover:bg-accent/50 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{option.label}</span>
                            {showCount && option.count !== undefined && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {option.count}
                              </Badge>
                            )}
                          </div>
                          {option.description && (
                            <span className="text-xs text-muted-foreground truncate">
                              {option.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4 shrink-0",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                  {grouped && category && categoryIndex < Object.keys(groupedOptions).length - 1 && (
                    <Separator className="my-1" />
                  )}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}