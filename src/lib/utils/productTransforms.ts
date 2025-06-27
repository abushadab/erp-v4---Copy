import type { Product, ProductVariation } from '@/lib/types'
import type { 
  DatabaseProduct, 
  DatabaseProductVariation,
  DatabaseAttribute, 
  DatabaseAttributeValue 
} from '@/lib/hooks/useProductData'

/**
 * Safely parses a string to a positive number, returning undefined for invalid inputs
 * @param value - The string value to parse
 * @returns The parsed number if valid and non-negative, undefined otherwise
 */
export function safeParsePrice(value: string): number | undefined {
  if (!value || value.trim() === '') return undefined
  
  const numericValue = parseFloat(value)
  const isValidNumber = !isNaN(numericValue) && numericValue >= 0
  
  return isValidNumber ? numericValue : undefined
}

/**
 * Type-safe helper to get attribute name by ID
 * @param attributes - Array of database attributes
 * @param attributeId - The attribute ID to look up
 * @returns The attribute name or 'Unknown'
 */
export function getAttributeName(attributes: DatabaseAttribute[], attributeId: string): string {
  const attribute = attributes.find(attr => attr.id === attributeId)
  return attribute?.name || 'Unknown'
}

/**
 * Type-safe helper to get attribute value name by IDs
 * @param attributes - Array of database attributes
 * @param attributeId - The attribute ID
 * @param valueId - The attribute value ID
 * @returns The attribute value label/name or 'Unknown'
 */
export function getAttributeValueName(
  attributes: DatabaseAttribute[], 
  attributeId: string, 
  valueId: string
): string {
  const attribute = attributes.find(attr => attr.id === attributeId)
  if (!attribute?.values) return 'Unknown'
  
  const value = attribute.values.find((val: DatabaseAttributeValue) => val.id === valueId)
  return value?.label || value?.value || 'Unknown'
}

export function transformDatabaseProductToProduct(dbProduct: DatabaseProduct): Product {
  const baseProduct: Product = {
    id: dbProduct.id,
    name: dbProduct.name,
    sku: dbProduct.sku,
    description: dbProduct.description,
    category: dbProduct.category?.name || 'Unknown',
    categoryId: dbProduct.category_id,
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
      stock: 0,
      boughtQuantity: 0,
    }
  } else {
    // Variation product
    const variations: ProductVariation[] = dbProduct.variations?.map((dbVariation: DatabaseProductVariation) => ({
      id: dbVariation.id,
      productId: dbVariation.product_id,
      sku: dbVariation.sku,
      price: dbVariation.price,
      // Legacy fields removed - will be handled by warehouse stock system
      buyingPrice: 0,
      stock: 0,
      boughtQuantity: 0,
      attributeValues: dbVariation.attribute_values?.reduce((acc: Record<string, string>, attr: { attribute_id: string; value_id: string }) => {
        acc[attr.attribute_id] = attr.value_id
        return acc
      }, {} as Record<string, string>) || {}
    })) || []

    return {
      ...baseProduct,
      variations,
      attributes: dbProduct.attributes?.map(attr => attr.id) || []
    }
  }
}