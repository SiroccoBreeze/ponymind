"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
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

export interface ComboboxOption {
  value: string
  label: string
  count?: number
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  clearable?: boolean
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "选择选项...",
  searchPlaceholder = "搜索...",
  emptyMessage = "未找到选项",
  className,
  disabled = false,
  clearable = true,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  )

  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
      option.value.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [options, searchValue])

  const handleSelect = React.useCallback((selectedValue: string) => {
    console.log('handleSelect called with:', selectedValue)
    const newValue = selectedValue === value ? "" : selectedValue
    onValueChange?.(newValue)
    setOpen(false)
    setSearchValue("")
  }, [value, onValueChange])

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange?.("")
  }

  const handleItemClick = (e: React.MouseEvent, optionValue: string) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('handleItemClick called with:', optionValue)
    handleSelect(optionValue)
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
            {selectedOption ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="truncate">{selectedOption.label}</span>
                {selectedOption.count !== undefined && (
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
          <CommandList style={{ maxHeight: '300px' }}>
            {filteredOptions.length === 0 ? (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                    className="flex items-center justify-between py-2 px-3 hover:bg-accent/50 cursor-pointer select-none"
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => handleItemClick(e, option.value)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="truncate font-medium">{option.label}</span>
                      {option.count !== undefined && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {option.count}
                        </Badge>
                      )}
                    </div>
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4 shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 