"use client"

import * as React from "react"
import { Search, Filter, X, ChevronDown, ChevronUp, Tag, User, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export interface FilterOption {
  value: string
  label: string
  count?: number
  description?: string
  category?: string
}

export interface FilterConfig {
  key: string
  label: string
  placeholder: string
  icon: React.ReactNode
  options: FilterOption[]
  type: 'single' | 'multiple'
  searchable?: boolean
}

interface AdvancedFilterProps {
  filters: FilterConfig[]
  values: Record<string, string | string[]>
  onValuesChange: (values: Record<string, string | string[]>) => void
  onSearch?: (searchTerm: string) => void
  searchPlaceholder?: string
  className?: string
}

export function AdvancedFilter({
  filters,
  values,
  onValuesChange,
  onSearch,
  searchPlaceholder = "搜索问题、文章、标签...",
  className,
}: AdvancedFilterProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [expandedFilters, setExpandedFilters] = React.useState<Set<string>>(new Set())

  const handleFilterChange = (filterKey: string, value: string | string[]) => {
    const newValues = { ...values, [filterKey]: value }
    onValuesChange(newValues)
  }

  const handleSearch = () => {
    onSearch?.(searchTerm)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const clearFilter = (filterKey: string) => {
    const newValues = { ...values }
    delete newValues[filterKey]
    onValuesChange(newValues)
  }

  const clearAllFilters = () => {
    onValuesChange({})
  }

  const toggleFilterExpansion = (filterKey: string) => {
    const newExpanded = new Set(expandedFilters)
    if (newExpanded.has(filterKey)) {
      newExpanded.delete(filterKey)
    } else {
      newExpanded.add(filterKey)
    }
    setExpandedFilters(newExpanded)
  }

  const hasActiveFilters = Object.keys(values).length > 0 || searchTerm

  return (
    <Card className={cn("mb-6", className)}>
      <CardContent className="p-4">
        {/* 主搜索区域 */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          
          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            onClick={() => toggleFilterExpansion('all')}
            className="shrink-0"
          >
            <Filter className="h-4 w-4 mr-2" />
            筛选
            {Object.keys(values).length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {Object.keys(values).length}
              </Badge>
            )}
          </Button>
          
          <Button onClick={handleSearch} className="shrink-0">
            <Search className="h-4 w-4 mr-2" />
            搜索
          </Button>
        </div>

        {/* 筛选器展开区域 */}
        {expandedFilters.has('all') && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filters.map((filter) => (
                <FilterDropdown
                  key={filter.key}
                  config={filter}
                  value={values[filter.key]}
                  onChange={(value) => handleFilterChange(filter.key, value)}
                  onClear={() => clearFilter(filter.key)}
                />
              ))}
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                清除所有筛选
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setExpandedFilters(new Set())}
              >
                收起筛选
              </Button>
            </div>
          </div>
        )}

        {/* 当前筛选条件显示 */}
        {hasActiveFilters && (
          <div className="pt-4 border-t">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">当前筛选:</span>
              
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  搜索: {searchTerm}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSearchTerm("")}
                  />
                </Badge>
              )}
              
              {Object.entries(values).map(([filterKey, filterValue]) => {
                const filter = filters.find(f => f.key === filterKey)
                if (!filter) return null
                
                const displayValue = Array.isArray(filterValue) 
                  ? filterValue.join(', ')
                  : filterValue
                
                return (
                  <Badge key={filterKey} variant="secondary" className="gap-1">
                    {filter.icon}
                    {filter.label}: {displayValue}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => clearFilter(filterKey)}
                    />
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface FilterDropdownProps {
  config: FilterConfig
  value: string | string[] | undefined
  onChange: (value: string | string[]) => void
  onClear: () => void
}

function FilterDropdown({ config, value, onChange, onClear }: FilterDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const selectedOptions = React.useMemo(() => {
    if (!value) return []
    const values = Array.isArray(value) ? value : [value]
    return config.options.filter(option => values.includes(option.value))
  }, [value, config.options])

  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return config.options
    return config.options.filter(option =>
      option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
      option.value.toLowerCase().includes(searchValue.toLowerCase()) ||
      option.description?.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [config.options, searchValue])

  const handleSelect = (selectedValue: string) => {
    if (config.type === 'multiple') {
      const currentValues = Array.isArray(value) ? value : []
      const newValues = currentValues.includes(selectedValue)
        ? currentValues.filter(v => v !== selectedValue)
        : [...currentValues, selectedValue]
      onChange(newValues)
    } else {
      const newValue = selectedValue === value ? "" : selectedValue
      onChange(newValue)
      setOpen(false)
    }
    setSearchValue("")
  }

  const displayValue = selectedOptions.length > 0
    ? selectedOptions.map(opt => opt.label).join(', ')
    : config.placeholder

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        {config.icon}
        {config.label}
      </label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "justify-between text-left font-normal h-10 w-full",
              !value && "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="truncate">{displayValue}</span>
              {selectedOptions.length > 0 && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {selectedOptions.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {value && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClear()
                  }}
                />
              )}
              {open ? (
                <ChevronUp className="h-4 w-4 opacity-50" />
              ) : (
                <ChevronDown className="h-4 w-4 opacity-50" />
              )}
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
            {config.searchable && (
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <CommandInput
                  placeholder={`搜索${config.label}...`}
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
            )}
            
            <CommandList style={{ maxHeight: '300px' }}>
              {filteredOptions.length === 0 ? (
                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                  未找到{config.label}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredOptions.map((option) => {
                    const isSelected = Array.isArray(value) 
                      ? value.includes(option.value)
                      : value === option.value
                    
                    return (
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
                              {option.count !== undefined && (
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
                        {isSelected && (
                          <div className="ml-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                          </div>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
} 