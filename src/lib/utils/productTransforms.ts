import type { Product, ProductVariation } from '@/lib/types'
import type { DatabaseProduct } from '@/lib/hooks/useProductData'

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
    const variations: ProductVariation[] = dbProduct.variations?.map(dbVariation => ({
      id: dbVariation.id,
      productId: dbVariation.product_id,
      sku: dbVariation.sku,
      price: dbVariation.price,
      // Legacy fields removed - will be handled by warehouse stock system
      buyingPrice: 0,
      stock: 0,
      boughtQuantity: 0,
      attributeValues: dbVariation.attribute_values?.reduce((acc: any, attr: any) => {
        acc[attr.attribute_id] = attr.value_id
        return acc
      }, {} as { [attributeId: string]: string }) || {}
    })) || []

    return {
      ...baseProduct,
      variations,
      attributes: dbProduct.attributes?.map(attr => attr.id) || []
    }
  }
}