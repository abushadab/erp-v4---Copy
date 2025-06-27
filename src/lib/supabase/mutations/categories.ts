import { createClient, generateSequentialId } from './base'

// Category types
export interface CreateCategoryData {
  name: string
  slug: string
  description?: string
  parent_id?: string
  status: 'active' | 'inactive'
}

export interface UpdateCategoryData {
  id: string
  name: string
  slug: string
  description?: string
  parent_id?: string
  status: 'active' | 'inactive'
}

/**
 * Create a new category
 */
export async function createCategory(categoryData: CreateCategoryData): Promise<void> {
  const supabase = createClient()
  
  console.log('🏗️ Creating category:', categoryData)
  
  const insertData = {
    id: await generateSequentialId('categories', 'CAT'),
    name: categoryData.name,
    slug: categoryData.slug,
    description: categoryData.description || null,
    parent_id: categoryData.parent_id || null,
    status: categoryData.status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('categories')
    .insert(insertData)
  
  if (error) {
    console.error('❌ Error creating category:', error)
    throw new Error(`Failed to create category: ${error.message}`)
  }
  
  console.log('✅ Category created successfully')
}

/**
 * Update a category
 */
export async function updateCategory(categoryData: UpdateCategoryData): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating category:', categoryData)
  
  const updateData = {
    name: categoryData.name,
    slug: categoryData.slug,
    description: categoryData.description || null,
    parent_id: categoryData.parent_id || null,
    status: categoryData.status,
    updated_at: new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('categories')
    .update(updateData)
    .eq('id', categoryData.id)
  
  if (error) {
    console.error('❌ Error updating category:', error)
    throw new Error(`Failed to update category: ${error.message}`)
  }
  
  console.log('✅ Category updated successfully')
}

/**
 * Delete a category
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  const supabase = createClient()
  
  console.log('🗑️ Deleting category:', categoryId)
  
  // Check if category has child categories
  const { data: childCategories, error: childError } = await supabase
    .from('categories')
    .select('id')
    .eq('parent_id', categoryId)
    .limit(1)
  
  if (childError) {
    console.error('❌ Error checking child categories:', childError)
    throw new Error(`Failed to check child categories: ${childError.message}`)
  }
  
  if (childCategories && childCategories.length > 0) {
    throw new Error('Cannot delete category that has child categories. Please delete or reassign child categories first.')
  }
  
  // Check if category has products
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id')
    .eq('category_id', categoryId)
    .limit(1)
  
  if (productError) {
    console.error('❌ Error checking category products:', productError)
    throw new Error(`Failed to check category products: ${productError.message}`)
  }
  
  if (products && products.length > 0) {
    throw new Error('Cannot delete category that has products. Please reassign products to another category first.')
  }
  
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
  
  if (error) {
    console.error('❌ Error deleting category:', error)
    throw new Error(`Failed to delete category: ${error.message}`)
  }
  
  console.log('✅ Category deleted successfully')
} 