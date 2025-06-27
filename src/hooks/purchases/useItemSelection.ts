import * as React from 'react'
import { toast } from 'sonner'
import { 
  getPackagingVariations,
  type DatabaseProduct, 
  type DatabasePackaging,
  type DatabaseProductVariation,
  type DatabasePackagingVariation
} from '@/lib/supabase/queries'
import { apiCache } from '@/lib/supabase/cache'

interface SelectedItem {
  id: string
  type: 'product' | 'package'
  name: string
  sku?: string
  variationId?: string
  variationName?: string
}

export interface UseItemSelectionReturn {
  // State
  selectedItems: SelectedItem[]
  isModalOpen: boolean
  isVariationModalOpen: boolean
  selectedPackageForVariation: DatabasePackaging | DatabaseProduct | null
  activeTab: string
  searchTerm: string
  productVariations: DatabaseProductVariation[]
  packageVariations: DatabasePackagingVariation[]
  
  // Setters
  setSelectedItems: React.Dispatch<React.SetStateAction<SelectedItem[]>>
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  setIsVariationModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  setSelectedPackageForVariation: React.Dispatch<React.SetStateAction<DatabasePackaging | DatabaseProduct | null>>
  setActiveTab: React.Dispatch<React.SetStateAction<string>>
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>
  setProductVariations: React.Dispatch<React.SetStateAction<DatabaseProductVariation[]>>
  setPackageVariations: React.Dispatch<React.SetStateAction<DatabasePackagingVariation[]>>
  
  // Methods
  handleProductSelection: (product: DatabaseProduct) => void
  handlePackageSelection: (packaging: DatabasePackaging) => void
  handleVariationSelection: (variation: DatabasePackagingVariation) => Promise<void>
  handleProductVariationSelection: (variation: DatabaseProductVariation) => Promise<void>
  handleProductSelectionWithVariations: (product: DatabaseProduct) => Promise<void>
  loadVariations: (item: DatabaseProduct | DatabasePackaging) => Promise<void>
  isItemSelected: (item: DatabaseProduct | DatabasePackaging, type: 'product' | 'package', variationId?: string) => boolean
  getSelectionSummary: () => string
}

// Type guard to check if the item is a Packaging
const isPackaging = (item: DatabasePackaging | DatabaseProduct): item is DatabasePackaging => {
  return 'title' in item
}

export function useItemSelection(): UseItemSelectionReturn {
  // State
  const [selectedItems, setSelectedItems] = React.useState<SelectedItem[]>([])
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isVariationModalOpen, setIsVariationModalOpen] = React.useState(false)
  const [selectedPackageForVariation, setSelectedPackageForVariation] = React.useState<DatabasePackaging | DatabaseProduct | null>(null)
  const [activeTab, setActiveTab] = React.useState('products')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [productVariations, setProductVariations] = React.useState<DatabaseProductVariation[]>([])
  const [packageVariations, setPackageVariations] = React.useState<DatabasePackagingVariation[]>([])

  const handleProductSelection = (product: DatabaseProduct) => {
    const isSelected = selectedItems.some(selected => 
      selected.id === product.id && selected.type === 'product'
    )

    if (isSelected) {
      setSelectedItems(prev => prev.filter(selected => 
        !(selected.id === product.id && selected.type === 'product')
      ))
    } else {
      const newItem: SelectedItem = {
        id: product.id,
        type: 'product',
        name: product.name,
        sku: product.sku,
      }
      setSelectedItems(prev => [...prev, newItem])
    }
  }

  const handlePackageSelection = (packaging: DatabasePackaging) => {
    if (packaging.type === 'variable') {
      setSelectedPackageForVariation(packaging)
      setIsVariationModalOpen(true)
    } else {
      const isSelected = selectedItems.some(selected => 
        selected.id === packaging.id && selected.type === 'package'
      )

      if (isSelected) {
        setSelectedItems(prev => prev.filter(selected => 
          !(selected.id === packaging.id && selected.type === 'package')
        ))
      } else {
        const newItem: SelectedItem = {
          id: packaging.id,
          type: 'package',
          name: packaging.title,
          sku: packaging.sku,
        }
        setSelectedItems(prev => [...prev, newItem])
      }
    }
  }

  const handleVariationSelection = async (variation: DatabasePackagingVariation) => {
    const packaging = selectedPackageForVariation as DatabasePackaging
    // Create a display name from attribute values
    const variationName = variation.attribute_values?.map(av => av.value_label).join(', ') || variation.sku
    const newItem: SelectedItem = {
      id: packaging.id,
      type: 'package',
      name: `${packaging.title} (${variationName})`,
      sku: packaging.sku,
      variationId: variation.id,
      variationName: variationName,
    }
    setSelectedItems(prev => [...prev, newItem])
    setIsVariationModalOpen(false)
    setSelectedPackageForVariation(null)
  }

  const handleProductVariationSelection = async (variation: DatabaseProductVariation) => {
    const product = selectedPackageForVariation as DatabaseProduct
    // Create a display name from attribute values
    const variationName = variation.attribute_values?.map(av => av.value_label).join(', ') || variation.sku
    const newItem: SelectedItem = {
      id: product.id,
      type: 'product',
      name: `${product.name} (${variationName})`,
      sku: product.sku,
      variationId: variation.id,
      variationName: variationName,
    }
    setSelectedItems(prev => [...prev, newItem])
    setIsVariationModalOpen(false)
    setSelectedPackageForVariation(null)
  }

  const loadVariations = React.useCallback(async (item: DatabaseProduct | DatabasePackaging) => {
    const cacheKey = `variations-${item.id}-${isPackaging(item) ? 'package' : 'product'}`
    
    try {
      console.log('🔄 Loading variations using global cache for:', cacheKey)
      
      if (isPackaging(item)) {
        // Use global cache for packaging variations
        const variations = await apiCache.get(cacheKey, () => getPackagingVariations(item.id))
        setPackageVariations(variations)
      } else {
        // For products, use the variations from the product object if available
        if (item.variations) {
          console.log('📦 Using product variations from object:', item.variations.length)
          setProductVariations(item.variations)
        } else {
          console.log('⚠️ No variations found in product object')
          setProductVariations([])
        }
      }
      
      console.log('✅ Variations loaded successfully for:', cacheKey)
    } catch (error) {
      console.error('❌ Error loading variations:', error)
      toast.error('Failed to load variations')
      
      // Set empty arrays on error
      if (isPackaging(item)) {
        setPackageVariations([])
      } else {
        setProductVariations([])
      }
    }
  }, [])

  const handleProductSelectionWithVariations = async (product: DatabaseProduct) => {
    if (product.type === 'variation') {
      setSelectedPackageForVariation(product)
      await loadVariations(product)
      setIsVariationModalOpen(true)
    } else {
      handleProductSelection(product)
    }
  }

  const isItemSelected = (item: DatabaseProduct | DatabasePackaging, type: 'product' | 'package', variationId?: string) => {
    return selectedItems.some(selected => 
      selected.id === item.id && 
      selected.type === type &&
      selected.variationId === variationId
    )
  }

  const getSelectionSummary = () => {
    const productCount = selectedItems.filter(item => item.type === 'product').length
    const packageCount = selectedItems.filter(item => item.type === 'package').length
    
    const parts = []
    if (productCount > 0) parts.push(`${productCount} product${productCount !== 1 ? 's' : ''}`)
    if (packageCount > 0) parts.push(`${packageCount} package${packageCount !== 1 ? 's' : ''}`)
    
    return parts.join(', ')
  }

  return {
    // State
    selectedItems,
    isModalOpen,
    isVariationModalOpen,
    selectedPackageForVariation,
    activeTab,
    searchTerm,
    productVariations,
    packageVariations,
    
    // Setters
    setSelectedItems,
    setIsModalOpen,
    setIsVariationModalOpen,
    setSelectedPackageForVariation,
    setActiveTab,
    setSearchTerm,
    setProductVariations,
    setPackageVariations,
    
    // Methods
    handleProductSelection,
    handlePackageSelection,
    handleVariationSelection,
    handleProductVariationSelection,
    handleProductSelectionWithVariations,
    loadVariations,
    isItemSelected,
    getSelectionSummary
  }
} 