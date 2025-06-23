import type { DatabaseProduct, DatabaseProductVariation } from './queries'

// Extended database product interface with calculated stock
interface DatabaseProductWithStock extends DatabaseProduct {
  stock?: number
  variations?: (DatabaseProductVariation & { stock?: number })[]
}
import type { Product, ProductVariation } from '../types'

/**
 * Transform database product to ERP Product interface
 */
export function transformDatabaseProductToProduct(dbProduct: DatabaseProductWithStock): Product {
  const baseProduct: Product = {
    id: dbProduct.id,
    name: dbProduct.name,
    sku: dbProduct.sku,
    description: dbProduct.description,
    category: dbProduct.category?.name || 'Uncategorized',
    categoryId: dbProduct.category_id || undefined,
    status: dbProduct.status,
    type: dbProduct.type,
    image: dbProduct.image_url,
    parentSku: dbProduct.parent_sku,
  }

  if (dbProduct.type === 'simple') {
    return {
      ...baseProduct,
      price: dbProduct.price,
      // Legacy fields removed - will be handled by warehouse stock system
      buyingPrice: 0,
      stock: dbProduct.stock || 0,
      boughtQuantity: 0,
    }
  } else {
    // Variation product
    const variations: ProductVariation[] = dbProduct.variations?.map(dbVariation => ({
      id: dbVariation.id,
      productId: dbVariation.product_id,
      sku: dbVariation.sku,
      price: dbVariation.price,
      // Legacy fields removed - will be handled by warehouse stock system
      buyingPrice: 0,
      stock: dbVariation.stock || 0, // Use the stock passed from warehouse query
      boughtQuantity: 0,
      attributeValues: dbVariation.attribute_values?.reduce((acc, attr) => {
        acc[attr.attribute_id] = attr.value_id
        return acc
      }, {} as { [attributeId: string]: string }) || {},
      // Preserve raw attribute_values for display purposes
      attribute_values: dbVariation.attribute_values || []
    })) || []

    return {
      ...baseProduct,
      variations,
      attributes: dbProduct.attributes?.map(attr => attr.id) || []
    }
  }
}

/**
 * Transform array of database products to ERP Products
 */
export function transformDatabaseProductsToProducts(dbProducts: DatabaseProduct[]): Product[] {
  return dbProducts.map(transformDatabaseProductToProduct)
}

/**
 * Calculate current stock for both simple and variation products
 */
export function calculateCurrentStock(product: Product): number {
  if (product.type === 'simple') {
    return product.stock || 0
  } else if (product.type === 'variation' && product.variations) {
    return product.variations.reduce((total, variation) => total + (variation.stock || 0), 0)
  }
  return 0
}

/**
 * Get low stock status for a product
 */
export function getLowStockStatus(product: Product): 'out_of_stock' | 'low_stock' | 'in_stock' {
  const stock = calculateCurrentStock(product)
  if (stock === 0) return 'out_of_stock'
  if (stock <= 10) return 'low_stock'
  return 'in_stock'
}

/**
 * Get display name for attribute values (for variation products)
 */
export function getAttributeValueDisplay(attributeId: string, valueId: string): string {
  // Map common attribute values to display names
  const attributeValueMap: { [key: string]: { [key: string]: string } } = {
    'ATTR001': { // Size
      'SIZE_S': 'Small',
      'SIZE_M': 'Medium', 
      'SIZE_L': 'Large',
      'SIZE_XL': 'Extra Large'
    },
    'ATTR002': { // Color
      'COLOR_BLACK': 'Black',
      'COLOR_WHITE': 'White',
      'COLOR_BLUE': 'Blue',
      'COLOR_RED': 'Red',
      'COLOR_GREEN': 'Green'
    }
  }

  return attributeValueMap[attributeId]?.[valueId] || valueId
}

/**
 * Generate variation display name from attributes
 */
export function getVariationDisplayName(variation: ProductVariation): string {
  if (!variation.attributeValues) return variation.sku

  const attributes = Object.entries(variation.attributeValues)
    .map(([attrId, valueId]) => getAttributeValueDisplay(attrId, valueId))
    .join(', ')

  return attributes || variation.sku
} 