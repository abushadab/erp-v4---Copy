import { Json } from './base'

export interface ProductTables {
  products: {
    Row: {
      category_id: string | null
      created_at: string | null
      description: string | null
      id: string
      image_url: string | null
      name: string
      parent_sku: string | null
      price: number | null
      sku: string | null
      status: string | null
      type: string | null
      updated_at: string | null
    }
    Insert: {
      category_id?: string | null
      created_at?: string | null
      description?: string | null
      id: string
      image_url?: string | null
      name: string
      parent_sku?: string | null
      price?: number | null
      sku?: string | null
      status?: string | null
      type?: string | null
      updated_at?: string | null
    }
    Update: {
      category_id?: string | null
      created_at?: string | null
      description?: string | null
      id?: string
      image_url?: string | null
      name?: string
      parent_sku?: string | null
      price?: number | null
      sku?: string | null
      status?: string | null
      type?: string | null
      updated_at?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "products_category_id_fkey"
        columns: ["category_id"]
        isOneToOne: false
        referencedRelation: "categories"
        referencedColumns: ["id"]
      },
    ]
  }
  categories: {
    Row: {
      created_at: string | null
      description: string | null
      id: string
      name: string
      parent_id: string | null
      slug: string
      status: string | null
      updated_at: string | null
    }
    Insert: {
      created_at?: string | null
      description?: string | null
      id: string
      name: string
      parent_id?: string | null
      slug: string
      status?: string | null
      updated_at?: string | null
    }
    Update: {
      created_at?: string | null
      description?: string | null
      id?: string
      name?: string
      parent_id?: string | null
      slug?: string
      status?: string | null
      updated_at?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "categories_parent_id_fkey"
        columns: ["parent_id"]
        isOneToOne: false
        referencedRelation: "categories"
        referencedColumns: ["id"]
      },
    ]
  }
  attributes: {
    Row: {
      created_at: string | null
      id: string
      name: string
      required: boolean | null
      type: string | null
      updated_at: string | null
    }
    Insert: {
      created_at?: string | null
      id: string
      name: string
      required?: boolean | null
      type?: string | null
      updated_at?: string | null
    }
    Update: {
      created_at?: string | null
      id?: string
      name?: string
      required?: boolean | null
      type?: string | null
      updated_at?: string | null
    }
    Relationships: []
  }
  attribute_values: {
    Row: {
      attribute_id: string
      created_at: string | null
      id: string
      label: string
      sort_order: number | null
      value: string
    }
    Insert: {
      attribute_id: string
      created_at?: string | null
      id: string
      label: string
      sort_order?: number | null
      value: string
    }
    Update: {
      attribute_id?: string
      created_at?: string | null
      id?: string
      label?: string
      sort_order?: number | null
      value?: string
    }
    Relationships: [
      {
        foreignKeyName: "attribute_values_attribute_id_fkey"
        columns: ["attribute_id"]
        isOneToOne: false
        referencedRelation: "attributes"
        referencedColumns: ["id"]
      },
    ]
  }
  product_attributes: {
    Row: {
      attribute_id: string
      product_id: string
    }
    Insert: {
      attribute_id: string
      product_id: string
    }
    Update: {
      attribute_id?: string
      product_id?: string
    }
    Relationships: [
      {
        foreignKeyName: "product_attributes_attribute_id_fkey"
        columns: ["attribute_id"]
        isOneToOne: false
        referencedRelation: "attributes"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "product_attributes_product_id_fkey"
        columns: ["product_id"]
        isOneToOne: false
        referencedRelation: "products"
        referencedColumns: ["id"]
      },
    ]
  }
  product_variations: {
    Row: {
      created_at: string | null
      id: string
      price: number
      product_id: string
      sku: string
      updated_at: string | null
    }
    Insert: {
      created_at?: string | null
      id: string
      price: number
      product_id: string
      sku: string
      updated_at?: string | null
    }
    Update: {
      created_at?: string | null
      id?: string
      price?: number
      product_id?: string
      sku?: string
      updated_at?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "product_variations_product_id_fkey"
        columns: ["product_id"]
        isOneToOne: false
        referencedRelation: "products"
        referencedColumns: ["id"]
      },
    ]
  }
  product_variation_attributes: {
    Row: {
      attribute_id: string
      attribute_value_id: string
      variation_id: string
    }
    Insert: {
      attribute_id: string
      attribute_value_id: string
      variation_id: string
    }
    Update: {
      attribute_id?: string
      attribute_value_id?: string
      variation_id?: string
    }
    Relationships: [
      {
        foreignKeyName: "product_variation_attributes_attribute_id_fkey"
        columns: ["attribute_id"]
        isOneToOne: false
        referencedRelation: "attributes"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "product_variation_attributes_attribute_value_id_fkey"
        columns: ["attribute_value_id"]
        isOneToOne: false
        referencedRelation: "attribute_values"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "product_variation_attributes_variation_id_fkey"
        columns: ["variation_id"]
        isOneToOne: false
        referencedRelation: "product_variations"
        referencedColumns: ["id"]
      },
    ]
  }
}

// Convenience type exports
export type Product = ProductTables['products']['Row']
export type Category = ProductTables['categories']['Row']
export type Attribute = ProductTables['attributes']['Row']
export type AttributeValue = ProductTables['attribute_values']['Row']
export type ProductAttribute = ProductTables['product_attributes']['Row']
export type ProductVariation = ProductTables['product_variations']['Row']
export type ProductVariationAttribute = ProductTables['product_variation_attributes']['Row']

// Legacy compatibility
export type DatabaseProductVariation = ProductVariation 