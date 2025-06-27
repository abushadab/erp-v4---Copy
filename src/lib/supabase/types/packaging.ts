import { Json } from './base'

export interface PackagingTables {
  packaging: {
    Row: {
      created_at: string | null
      description: string | null
      id: string
      sku: string | null
      status: string
      title: string
      type: string
      updated_at: string | null
    }
    Insert: {
      created_at?: string | null
      description?: string | null
      id: string
      sku?: string | null
      status?: string
      title: string
      type: string
      updated_at?: string | null
    }
    Update: {
      created_at?: string | null
      description?: string | null
      id?: string
      sku?: string | null
      status?: string
      title?: string
      type?: string
      updated_at?: string | null
    }
    Relationships: []
  }
  packaging_attributes: {
    Row: {
      created_at: string | null
      id: string
      name: string
      slug: string
      status: string
      updated_at: string | null
    }
    Insert: {
      created_at?: string | null
      id: string
      name: string
      slug: string
      status?: string
      updated_at?: string | null
    }
    Update: {
      created_at?: string | null
      id?: string
      name?: string
      slug?: string
      status?: string
      updated_at?: string | null
    }
    Relationships: []
  }
  packaging_attribute_values: {
    Row: {
      attribute_id: string
      created_at: string | null
      id: string
      label: string
      slug: string
      sort_order: number | null
      value: string
    }
    Insert: {
      attribute_id: string
      created_at?: string | null
      id: string
      label: string
      slug: string
      sort_order?: number | null
      value: string
    }
    Update: {
      attribute_id?: string
      created_at?: string | null
      id?: string
      label?: string
      slug?: string
      sort_order?: number | null
      value?: string
    }
    Relationships: [
      {
        foreignKeyName: "packaging_attribute_values_attribute_id_fkey"
        columns: ["attribute_id"]
        isOneToOne: false
        referencedRelation: "packaging_attributes"
        referencedColumns: ["id"]
      },
    ]
  }
  packaging_packaging_attributes: {
    Row: {
      attribute_id: string
      packaging_id: string
    }
    Insert: {
      attribute_id: string
      packaging_id: string
    }
    Update: {
      attribute_id?: string
      packaging_id?: string
    }
    Relationships: [
      {
        foreignKeyName: "packaging_packaging_attributes_attribute_id_fkey"
        columns: ["attribute_id"]
        isOneToOne: false
        referencedRelation: "packaging_attributes"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "packaging_packaging_attributes_packaging_id_fkey"
        columns: ["packaging_id"]
        isOneToOne: false
        referencedRelation: "packaging"
        referencedColumns: ["id"]
      },
    ]
  }
  packaging_variations: {
    Row: {
      created_at: string | null
      id: string
      packaging_id: string
      sku: string
      updated_at: string | null
    }
    Insert: {
      created_at?: string | null
      id: string
      packaging_id: string
      sku: string
      updated_at?: string | null
    }
    Update: {
      created_at?: string | null
      id?: string
      packaging_id?: string
      sku?: string
      updated_at?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "packaging_variations_packaging_id_fkey"
        columns: ["packaging_id"]
        isOneToOne: false
        referencedRelation: "packaging"
        referencedColumns: ["id"]
      },
    ]
  }
  packaging_variation_attributes: {
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
        foreignKeyName: "packaging_variation_attributes_attribute_id_fkey"
        columns: ["attribute_id"]
        isOneToOne: false
        referencedRelation: "packaging_attributes"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "packaging_variation_attributes_attribute_value_id_fkey"
        columns: ["attribute_value_id"]
        isOneToOne: false
        referencedRelation: "packaging_attribute_values"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "packaging_variation_attributes_variation_id_fkey"
        columns: ["variation_id"]
        isOneToOne: false
        referencedRelation: "packaging_variations"
        referencedColumns: ["id"]
      },
    ]
  }
}

// Convenience type exports
export type Packaging = PackagingTables['packaging']['Row']
export type PackagingAttribute = PackagingTables['packaging_attributes']['Row']
export type PackagingAttributeValue = PackagingTables['packaging_attribute_values']['Row']
export type PackagingPackagingAttribute = PackagingTables['packaging_packaging_attributes']['Row']
export type PackagingVariation = PackagingTables['packaging_variations']['Row']
export type PackagingVariationAttribute = PackagingTables['packaging_variation_attributes']['Row']

// Legacy compatibility
export type DatabasePackaging = Packaging
export type DatabasePackagingVariation = PackagingVariation 