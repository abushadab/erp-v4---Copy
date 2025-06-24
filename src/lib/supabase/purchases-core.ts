/**
 * Purchase Core Functions Module
 * 
 * This module contains the core business logic functions for purchase management.
 * These functions handle the main CRUD operations and business processes.
 */

import { createClient } from './client'
import { PurchaseEvent } from './purchases-types'

/**
 * Create timeline event function
 * Core function for creating purchase timeline events
 */
export async function createPurchaseEvent(eventData: {
  purchase_id: string
  event_type: PurchaseEvent['event_type']
  event_title: string
  event_description?: string
  previous_status?: string
  new_status?: string
  affected_items_count?: number
  total_items_count?: number
  return_reason?: string
  return_amount?: number
  payment_amount?: number
  payment_method?: string
  payment_id?: string
  metadata?: any
  created_by?: string
}): Promise<string> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('purchase_events')
      .insert([eventData])
      .select('id')
      .single()

    if (error) {
      // Handle duplicate order_placed events gracefully
      if (error.code === '23505' && eventData.event_type === 'order_placed') {
        console.log(`Order placed event already exists for ${eventData.purchase_id}, skipping duplicate`)
        // Return a placeholder ID since this is not an error
        return 'duplicate-prevented'
      }
      
      const errorMessage = error.message || JSON.stringify(error) || 'Unknown database error'
      console.error('Error creating purchase event:', errorMessage)
      throw new Error(`Failed to create purchase event: ${errorMessage}`)
    }

    return data.id
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 
                        (error && typeof error === 'object' ? JSON.stringify(error) : 
                         String(error) || 'Unknown error')
    console.error('Error in createPurchaseEvent:', errorMessage)
    throw new Error(`Error in createPurchaseEvent: ${errorMessage}`)
  }
}

/**
 * Get purchase by ID function
 * Core function that needs to be imported by utils
 */
export async function getPurchaseById(id: string) {
  // Import withPurchaseDeduplication dynamically to avoid circular dependency
  const { withPurchaseDeduplication } = await import('./purchases-utils')
  
  return withPurchaseDeduplication(`purchase-${id}`, async () => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        *,
        items:purchase_items(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Purchase not found
      }
      console.error('Error fetching purchase:', error)
      throw new Error('Failed to fetch purchase')
    }

    return data
  })
}