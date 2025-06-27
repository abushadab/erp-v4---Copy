import { type DatabasePackaging, type DatabaseProduct } from '@/lib/supabase/queries'

/**
 * Format currency amount in BDT
 */
export const formatCurrency = (amount: number): string => {
  return '৳ ' + new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Type guard to check if the item is a Packaging
 * Uses multiple properties to ensure robust type checking
 */
export const isPackaging = (item: DatabasePackaging | DatabaseProduct): item is DatabasePackaging => {
  return 'title' in item && !('name' in item)
}

/**
 * Get item type label based on item type
 */
export const getItemTypeLabel = (itemType: 'product' | 'package') => {
  return itemType === 'package' ? 'Package' : 'Product'
}

/**
 * Get item type badge variant based on item type
 */
export const getItemTypeBadgeConfig = (itemType: 'product' | 'package') => {
  return itemType === 'package' 
    ? { variant: 'secondary' as const, className: 'text-xs bg-purple-100 text-purple-800', text: 'Package' }
    : { variant: 'secondary' as const, className: 'text-xs bg-blue-100 text-blue-800', text: 'Product' }
}

/**
 * Extract base name and variation details from item name
 */
export const getItemDisplayInfo = (itemName: string): { baseName: string; variation: string | null } => {
  if (itemName.includes(' (') && itemName.includes(')')) {
    const lastParenIndex = itemName.lastIndexOf(' (')
    const baseName = itemName.substring(0, lastParenIndex)
    const variation = itemName.substring(lastParenIndex + 2, itemName.length - 1)
    return { baseName, variation }
  }
  return { baseName: itemName, variation: null }
}

/**
 * Filter products based on search term
 */
export const filterProducts = (products: DatabaseProduct[], searchTerm: string): DatabaseProduct[] => {
  if (!searchTerm.trim()) return products
  
  const searchLower = searchTerm.toLowerCase()
  return products.filter(product => 
    product.name.toLowerCase().includes(searchLower) ||
    product.sku?.toLowerCase().includes(searchLower) ||
    product.description?.toLowerCase().includes(searchLower)
  )
}

/**
 * Filter packages based on search term
 */
export const filterPackages = (packages: DatabasePackaging[], searchTerm: string): DatabasePackaging[] => {
  if (!searchTerm.trim()) return packages
  
  const searchLower = searchTerm.toLowerCase()
  return packages.filter(packaging => 
    packaging.title.toLowerCase().includes(searchLower) ||
    packaging.sku?.toLowerCase().includes(searchLower) ||
    packaging.description?.toLowerCase().includes(searchLower)
  )
} 