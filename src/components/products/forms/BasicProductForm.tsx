'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DatabaseCategory } from '@/lib/hooks/useProductData'

interface ProductForm {
  name: string
  description: string
  categoryId?: string
  type: 'simple' | 'variation'
  status: 'active' | 'inactive'
}

interface BasicProductFormProps {
  form: ProductForm
  onFormChange: (form: ProductForm) => void
  categories: DatabaseCategory[]
  isTypeReadOnly?: boolean
}

export function BasicProductForm({
  form,
  onFormChange,
  categories,
  isTypeReadOnly = false
}: BasicProductFormProps) {
  const handleNameChange = (value: string) => {
    onFormChange({ ...form, name: value })
  }

  const handleDescriptionChange = (value: string) => {
    onFormChange({ ...form, description: value })
  }

  const handleCategoryChange = (value: string) => {
    onFormChange({ ...form, categoryId: value })
  }

  const handleTypeChange = (value: 'simple' | 'variation') => {
    if (!isTypeReadOnly) {
      onFormChange({ ...form, type: value })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>
          Product name, description, and category
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter product name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Enter product description"
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select
            value={form.categoryId}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-medium mb-2 block">Product Type</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div 
              className={`p-3 sm:p-4 border-2 rounded-lg transition-all duration-200 ${
                form.type === 'simple' 
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                  : 'border-muted-foreground/30 bg-muted/30'
              } ${isTypeReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}`}
              onClick={() => handleTypeChange('simple')}
            >
              <div className="flex items-start sm:items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 sm:mt-0 flex-shrink-0 ${
                  form.type === 'simple' ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {form.type === 'simple' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm sm:text-base">Simple Product</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                    Single product with one SKU
                  </p>
                </div>
              </div>
            </div>

            <div 
              className={`p-3 sm:p-4 border-2 rounded-lg transition-all duration-200 ${
                form.type === 'variation' 
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                  : 'border-muted-foreground/30 bg-muted/30'
              } ${isTypeReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}`}
              onClick={() => handleTypeChange('variation')}
            >
              <div className="flex items-start sm:items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 sm:mt-0 flex-shrink-0 ${
                  form.type === 'variation' ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {form.type === 'variation' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm sm:text-base">Variable Product</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                    Multiple variations with different attributes
                  </p>
                </div>
              </div>
            </div>
          </div>
          {isTypeReadOnly && (
            <p className="text-xs text-muted-foreground">
              Product type cannot be changed after creation
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}