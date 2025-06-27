'use client'

import React from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AttributeValuesEditorProps {
  values: string[]
  onAddValue: () => void
  onUpdateValue: (index: number, value: string) => void
  onRemoveValue: (index: number) => void
  label?: string
  placeholder?: (index: number) => string
  className?: string
  showAddButton?: boolean
  addButtonText?: string
  addButtonClassName?: string
  maxHeight?: string
  disabled?: boolean
}

export function AttributeValuesEditor({
  values,
  onAddValue,
  onUpdateValue,
  onRemoveValue,
  label = "Values",
  placeholder = (index) => `Value ${index + 1}`,
  className,
  showAddButton = true,
  addButtonText = "Add Value",
  addButtonClassName = "w-full",
  maxHeight = "max-h-48",
  disabled = false
}: AttributeValuesEditorProps) {
  return (
    <div className={`space-y-3 ${className || ''}`}>
      {label && (
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          {showAddButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddValue}
              disabled={disabled}
            >
              <Plus className="mr-2 h-4 w-4" />
              {addButtonText}
            </Button>
          )}
        </div>
      )}
      
      <div className={`space-y-2 overflow-y-auto ${maxHeight}`}>
        {values.map((value, index) => (
          <div key={`value-${index}-${value}`} className="flex gap-2">
            <Input
              value={value}
              onChange={(e) => onUpdateValue(index, e.target.value)}
              placeholder={placeholder(index)}
              className="flex-1"
              disabled={disabled}
            />
            {values.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveValue(index)}
                className="h-10 w-10 p-0"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      
      {showAddButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddValue}
          className={addButtonClassName}
          disabled={disabled}
        >
          <Plus className="mr-2 h-4 w-4" />
          {addButtonText}
        </Button>
      )}
    </div>
  )
}