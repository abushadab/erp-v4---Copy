import { createClient } from './client'

export interface ActivityLogData {
  action: string
  resourceType: string
  resourceId?: string
  resourceName?: string
  description?: string
  oldValues?: any
  newValues?: any
}

export class ActivityLogger {
  private static instance: ActivityLogger
  private supabase = createClient()

  static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger()
    }
    return ActivityLogger.instance
  }

  /**
   * Log user activity
   */
  async logActivity(data: ActivityLogData): Promise<string | null> {
    try {
      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        console.warn('No authenticated user found for activity logging')
        return null
      }

      // Get user profile to get name (email comes from auth.users)
      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      // Get user agent and other client info
      const userAgent = navigator.userAgent
      const ipAddress = await this.getClientIP()

      // Use the simplified version that accepts user details directly
      const { data: result, error } = await this.supabase.rpc('log_activity_simple', {
        p_user_id: user.id,
        p_user_name: userProfile?.name || user.email || 'Unknown User',
        p_user_email: user.email || null,
        p_action: data.action,
        p_resource_type: data.resourceType,
        p_resource_id: data.resourceId || null,
        p_resource_name: data.resourceName || null,
        p_description: data.description || null,
        p_old_values: data.oldValues ? JSON.stringify(data.oldValues) : null,
        p_new_values: data.newValues ? JSON.stringify(data.newValues) : null,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_session_id: this.getSessionId()
      })

      if (error) {
        console.error('Error logging activity:', error)
        return null
      }

      return result
    } catch (error) {
      console.error('Activity logging failed:', error)
      return null
    }
  }

  /**
   * Log user login
   */
  async logLogin(): Promise<void> {
    await this.logActivity({
      action: 'login',
      resourceType: 'system',
      resourceName: 'ERP System',
      description: 'User logged into the system'
    })
  }

  /**
   * Log product creation
   */
  async logProductCreate(productId: string, productName: string, productData?: any): Promise<void> {
    await this.logActivity({
      action: 'create',
      resourceType: 'product',
      resourceId: productId,
      resourceName: productName,
      description: `Created new product: ${productName}`,
      newValues: productData
    })
  }

  /**
   * Log product update
   */
  async logProductUpdate(productId: string, productName: string, oldData?: any, newData?: any): Promise<void> {
    await this.logActivity({
      action: 'update',
      resourceType: 'product',
      resourceId: productId,
      resourceName: productName,
      description: `Updated product: ${productName}`,
      oldValues: oldData,
      newValues: newData
    })
  }

  /**
   * Log warehouse creation
   */
  async logWarehouseCreate(warehouseId: string, warehouseName: string, warehouseData?: any): Promise<void> {
    await this.logActivity({
      action: 'create',
      resourceType: 'warehouse',
      resourceId: warehouseId,
      resourceName: warehouseName,
      description: `Created new warehouse: ${warehouseName}`,
      newValues: warehouseData
    })
  }

  /**
   * Log warehouse update
   */
  async logWarehouseUpdate(warehouseId: string, warehouseName: string, oldData?: any, newData?: any): Promise<void> {
    await this.logActivity({
      action: 'update',
      resourceType: 'warehouse',
      resourceId: warehouseId,
      resourceName: warehouseName,
      description: `Updated warehouse: ${warehouseName}`,
      oldValues: oldData,
      newValues: newData
    })
  }

  /**
   * Log packaging creation
   */
  async logPackagingCreate(packagingId: string, packagingTitle: string, packagingData?: any): Promise<void> {
    await this.logActivity({
      action: 'create',
      resourceType: 'packaging',
      resourceId: packagingId,
      resourceName: packagingTitle,
      description: `Created new packaging: ${packagingTitle}`,
      newValues: packagingData
    })
  }

  /**
   * Log packaging update
   */
  async logPackagingUpdate(packagingId: string, packagingTitle: string, oldData?: any, newData?: any): Promise<void> {
    await this.logActivity({
      action: 'update',
      resourceType: 'packaging',
      resourceId: packagingId,
      resourceName: packagingTitle,
      description: `Updated packaging: ${packagingTitle}`,
      oldValues: oldData,
      newValues: newData
    })
  }

  /**
   * Log purchase creation
   */
  async logPurchaseCreate(purchaseId: string, supplierName: string, totalAmount: number, purchaseData?: any): Promise<void> {
    await this.logActivity({
      action: 'create',
      resourceType: 'purchase',
      resourceId: purchaseId,
      resourceName: `Purchase from ${supplierName}`,
      description: `Created new purchase from ${supplierName} for ৳${totalAmount.toLocaleString('en-BD')}`,
      newValues: purchaseData
    })
  }

  /**
   * Log purchase update
   */
  async logPurchaseUpdate(purchaseId: string, supplierName: string, oldData?: any, newData?: any): Promise<void> {
    await this.logActivity({
      action: 'update',
      resourceType: 'purchase',
      resourceId: purchaseId,
      resourceName: `Purchase from ${supplierName}`,
      description: `Updated purchase from ${supplierName}`,
      oldValues: oldData,
      newValues: newData
    })
  }

  /**
   * Log sale creation
   */
  async logSaleCreate(saleId: string, customerName: string, totalAmount: number, saleData?: any): Promise<void> {
    await this.logActivity({
      action: 'create',
      resourceType: 'sale',
      resourceId: saleId,
      resourceName: `Sale to ${customerName}`,
      description: `Created new sale to ${customerName} for ৳${totalAmount.toLocaleString('en-BD')}`,
      newValues: saleData
    })
  }

  /**
   * Log sale update
   */
  async logSaleUpdate(saleId: string, customerName: string, oldData?: any, newData?: any): Promise<void> {
    await this.logActivity({
      action: 'update',
      resourceType: 'sale',
      resourceId: saleId,
      resourceName: `Sale to ${customerName}`,
      description: `Updated sale to ${customerName}`,
      oldValues: oldData,
      newValues: newData
    })
  }

  /**
   * Log supplier creation
   */
  async logSupplierCreate(supplierId: string, supplierName: string, supplierData?: any): Promise<void> {
    await this.logActivity({
      action: 'create',
      resourceType: 'supplier',
      resourceId: supplierId,
      resourceName: supplierName,
      description: `Created new supplier: ${supplierName}`,
      newValues: supplierData
    })
  }

  /**
   * Log supplier update
   */
  async logSupplierUpdate(supplierId: string, supplierName: string, oldData?: any, newData?: any): Promise<void> {
    await this.logActivity({
      action: 'update',
      resourceType: 'supplier',
      resourceId: supplierId,
      resourceName: supplierName,
      description: `Updated supplier: ${supplierName}`,
      oldValues: oldData,
      newValues: newData
    })
  }

  /**
   * Log customer creation
   */
  async logCustomerCreate(customerId: string, customerName: string, customerData?: any): Promise<void> {
    await this.logActivity({
      action: 'create',
      resourceType: 'customer',
      resourceId: customerId,
      resourceName: customerName,
      description: `Created new customer: ${customerName}`,
      newValues: customerData
    })
  }

  /**
   * Log customer update
   */
  async logCustomerUpdate(customerId: string, customerName: string, oldData?: any, newData?: any): Promise<void> {
    await this.logActivity({
      action: 'update',
      resourceType: 'customer',
      resourceId: customerId,
      resourceName: customerName,
      description: `Updated customer: ${customerName}`,
      oldValues: oldData,
      newValues: newData
    })
  }

  /**
   * Log account creation
   */
  async logAccountCreate(accountId: string, accountName: string, accountData?: any): Promise<void> {
    await this.logActivity({
      action: 'create',
      resourceType: 'account',
      resourceId: accountId,
      resourceName: accountName,
      description: `Created new account: ${accountName}`,
      newValues: accountData
    })
  }

  /**
   * Log account update
   */
  async logAccountUpdate(accountId: string, accountName: string, oldData?: any, newData?: any): Promise<void> {
    await this.logActivity({
      action: 'update',
      resourceType: 'account',
      resourceId: accountId,
      resourceName: accountName,
      description: `Updated account: ${accountName}`,
      oldValues: oldData,
      newValues: newData
    })
  }

  /**
   * Get client IP address (simplified - in production you might use a service)
   */
  private async getClientIP(): Promise<string | null> {
    try {
      // In a real application, you might want to use a service like ipapi.co
      // For now, we'll return null and let the server handle it
      return null
    } catch {
      return null
    }
  }

  /**
   * Get or create a session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('erp_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('erp_session_id', sessionId)
    }
    return sessionId
  }
}

// Export singleton instance
export const activityLogger = ActivityLogger.getInstance()

// Export convenience functions
export const logActivity = (data: ActivityLogData) => activityLogger.logActivity(data)
export const logLogin = () => activityLogger.logLogin()
export const logProductCreate = (id: string, name: string, data?: any) => activityLogger.logProductCreate(id, name, data)
export const logProductUpdate = (id: string, name: string, oldData?: any, newData?: any) => activityLogger.logProductUpdate(id, name, oldData, newData)
export const logWarehouseCreate = (id: string, name: string, data?: any) => activityLogger.logWarehouseCreate(id, name, data)
export const logWarehouseUpdate = (id: string, name: string, oldData?: any, newData?: any) => activityLogger.logWarehouseUpdate(id, name, oldData, newData)
export const logPackagingCreate = (id: string, title: string, data?: any) => activityLogger.logPackagingCreate(id, title, data)
export const logPackagingUpdate = (id: string, title: string, oldData?: any, newData?: any) => activityLogger.logPackagingUpdate(id, title, oldData, newData)
export const logPurchaseCreate = (id: string, supplier: string, amount: number, data?: any) => activityLogger.logPurchaseCreate(id, supplier, amount, data)
export const logPurchaseUpdate = (id: string, supplier: string, oldData?: any, newData?: any) => activityLogger.logPurchaseUpdate(id, supplier, oldData, newData)
export const logSaleCreate = (id: string, customer: string, amount: number, data?: any) => activityLogger.logSaleCreate(id, customer, amount, data)
export const logSaleUpdate = (id: string, customer: string, oldData?: any, newData?: any) => activityLogger.logSaleUpdate(id, customer, oldData, newData)
export const logSupplierCreate = (id: string, name: string, data?: any) => activityLogger.logSupplierCreate(id, name, data)
export const logSupplierUpdate = (id: string, name: string, oldData?: any, newData?: any) => activityLogger.logSupplierUpdate(id, name, oldData, newData)
export const logCustomerCreate = (id: string, name: string, data?: any) => activityLogger.logCustomerCreate(id, name, data)
export const logCustomerUpdate = (id: string, name: string, oldData?: any, newData?: any) => activityLogger.logCustomerUpdate(id, name, oldData, newData)
export const logAccountCreate = (id: string, name: string, data?: any) => activityLogger.logAccountCreate(id, name, data)
export const logAccountUpdate = (id: string, name: string, oldData?: any, newData?: any) => activityLogger.logAccountUpdate(id, name, oldData, newData) 