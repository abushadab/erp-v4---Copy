// Supabase User Management Functions

import { createClient as createGenericClient } from '@supabase/supabase-js'
import { Database, ExtendedUser, Role, Permission } from '@/lib/types/supabase-types'
import { createClient } from './client'

/**
 * Get all users with their roles and permissions
 */
export async function getAllUsersWithRoles(): Promise<ExtendedUser[]> {
  try {
    const { data, error } = await createClient().rpc('get_all_users_with_roles')
    
    if (error) {
      console.error('Error fetching users:', error)
      throw error
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getAllUsersWithRoles:', error)
    throw error
  }
}

// Global cache for user permissions to prevent duplicate API calls
const userPermissionsCache = new Map<string, {
  data: ExtendedUser | null;
  timestamp: number;
  promise?: Promise<ExtendedUser | null>;
}>();

const CACHE_DURATION = 2 * 60 * 1000; // Reduced to 2 minutes for production
const PRODUCTION_TIMEOUT = 5000; // 5 seconds for production (faster timeout)
const MAX_RETRIES = 2;

/**
 * Get a specific user with their roles and permissions (with caching and production optimizations)
 */
export async function getUserWithPermissions(userId: string): Promise<ExtendedUser | null> {
  console.log('🔍 getUserWithPermissions called for userId:', userId);
  
  const now = Date.now();
  const cached = userPermissionsCache.get(userId);
  
  // Return cached data if it's fresh
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log('📦 Using cached user permissions data for:', userId);
    return cached.data;
  }
  
  // If there's already a request in progress, wait for it with timeout protection
  if (cached?.promise) {
    console.log('⏳ Request already in progress for user:', userId, '- waiting for existing promise...');
    try {
      // Shorter timeout for production
      const timeoutPromise = new Promise<ExtendedUser | null>((_, reject) => 
        setTimeout(() => reject(new Error('Promise timeout')), 4000)
      );
      return await Promise.race([cached.promise, timeoutPromise]);
    } catch (error) {
      console.warn('⚠️ Cached promise timed out or failed, creating new request for user:', userId);
      // Clear the stuck promise and continue with new request
      userPermissionsCache.set(userId, {
        data: cached.data,
        timestamp: cached.timestamp,
        promise: undefined
      });
    }
  }
  
  // Create new request promise with production-optimized timeout and retry logic
  const requestPromise = (async (): Promise<ExtendedUser | null> => {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`⏰ getUserWithPermissions timeout for userId: ${userId} (attempt ${attempt}/${MAX_RETRIES})`);
        abortController.abort();
      }, PRODUCTION_TIMEOUT);

      try {
        console.log(`🔄 Fetching fresh user permissions data from API for: ${userId} (attempt ${attempt}/${MAX_RETRIES})`);
        
        const supabase = createClient();
        
        // First validate session before making RPC call
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          console.error('❌ Session validation failed:', sessionError);
          throw new Error('Invalid session - please login again');
        }
        
        // Try the RPC call with signal for timeout
        const { data, error } = await supabase.rpc('get_user_with_permissions', {
          user_id: userId
        });
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error(`❌ API error fetching user (attempt ${attempt}):`, error);
          
          // Check if it's a specific error that shouldn't be retried
          if (error.code === 'PGRST116' || error.message?.includes('not found')) {
            throw error; // Don't retry for these errors
          }
          
          lastError = error;
          if (attempt < MAX_RETRIES) {
            console.log(`🔄 Retrying in 1 second... (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw error;
        }
        
        const result = data?.[0] || null;
        console.log('📦 Fresh user data received:', { 
          id: result?.id, 
          name: result?.name, 
          email: result?.email,
          department: result?.department 
        });
        
        // Update cache with result
        userPermissionsCache.set(userId, {
          data: result,
          timestamp: now,
          promise: undefined
        });
        
        console.log(`✅ User permissions data fetched and cached for: ${userId} (attempt ${attempt})`);
        return result;
        
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;
        
        // If it's an abort error (timeout) and we have retries left, continue
        if (error instanceof Error && error.name === 'AbortError' && attempt < MAX_RETRIES) {
          console.log(`⏰ Request timeout, retrying... (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // For final attempt or non-retryable errors, break out of loop
        break;
      }
    }
    
    // Remove the promise from cache on error so next call can retry
    const currentCached = userPermissionsCache.get(userId);
    if (currentCached) {
      userPermissionsCache.set(userId, {
        ...currentCached,
        promise: undefined
      });
    }
    
    console.error('❌ All retry attempts failed for getUserWithPermissions:', userId, lastError);
    
    // Provide better error messages for production
    if (lastError instanceof Error && lastError.name === 'AbortError') {
      throw new Error('Connection timeout - please check your internet connection and try again');
    }
    
    if (lastError?.message?.includes('JWT') || lastError?.message?.includes('session')) {
      throw new Error('Session expired - please login again');
    }
    
    throw new Error('Failed to load user data - please refresh the page and try again');
  })();
  
  // Store the promise in cache
  userPermissionsCache.set(userId, {
    data: cached?.data || null,
    timestamp: cached?.timestamp || 0,
    promise: requestPromise
  });
  
  return await requestPromise;
}

/**
 * Clear user permissions cache (useful after role changes)
 */
export function clearUserPermissionsCache(userId?: string): void {
  if (userId) {
    const hadCachedData = userPermissionsCache.has(userId);
    console.log('🗑️ Clearing user permissions cache for:', userId, '- had cached data:', hadCachedData);
    userPermissionsCache.delete(userId);
    console.log('✅ Cache cleared for user:', userId, '- cache size now:', userPermissionsCache.size);
  } else {
    const cacheSize = userPermissionsCache.size;
    console.log('🗑️ Clearing all user permissions cache - current size:', cacheSize);
    userPermissionsCache.clear();
    console.log('✅ All cache cleared - cache size now:', userPermissionsCache.size);
  }
}

/**
 * Update user profile information
 */
export async function updateUserProfile(
  userId: string, 
  updates: Partial<Database['public']['Tables']['user_profiles']['Update']>
): Promise<void> {
  console.log('📝 updateUserProfile called with:', { userId, updates })
  
  try {
    console.log('🔗 Creating Supabase client and executing update...')
    const { error } = await createClient()
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
    
    if (error) {
      console.error('❌ Database error updating user profile:', error)
      throw error
    }
    
    console.log('✅ Database update successful')
    
    // Clear the user permissions cache to force fresh data on next fetch
    console.log('🗑️ Clearing user cache after profile update for:', userId)
    clearUserPermissionsCache(userId)
    console.log('✅ User cache cleared successfully')
  } catch (error) {
    console.error('❌ Error in updateUserProfile:', error)
    throw error
  }
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    const { error } = await createClient().rpc('update_last_login', {
      user_id: userId
    })
    
    if (error) {
      console.error('Error updating last login:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in updateLastLogin:', error)
    throw error
  }
}

/**
 * Assign a role to a user
 */
export async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
  try {
    const { error } = await createClient().rpc('assign_role_to_user', {
      user_id: userId,
      role_id: roleId
    })
    
    if (error) {
      console.error('Error assigning role to user:', error)
      throw error
    }
    
    // Clear cache for this user since their permissions changed
    clearUserPermissionsCache(userId);
  } catch (error) {
    console.error('Error in assignRoleToUser:', error)
    throw error
  }
}

/**
 * Remove a role from a user
 */
export async function removeRoleFromUser(userId: string, roleId: string): Promise<void> {
  try {
    const { error } = await createClient().rpc('remove_role_from_user', {
      user_id: userId,
      role_id: roleId
    })
    
    if (error) {
      console.error('Error removing role from user:', error)
      throw error
    }
    
    // Clear cache for this user since their permissions changed
    clearUserPermissionsCache(userId);
  } catch (error) {
    console.error('Error in removeRoleFromUser:', error)
    throw error
  }
}

/**
 * Get all available roles
 */
export async function getAllRoles(): Promise<Role[]> {
  try {
    const { data, error } = await createClient()
      .from('roles')
      .select('*')
      .eq('status', 'active')
      .order('name')
    
    if (error) {
      console.error('Error fetching roles:', error)
      throw error
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getAllRoles:', error)
    throw error
  }
}

/**
 * Get all available permissions
 */
export async function getAllPermissions(): Promise<Permission[]> {
  try {
    const { data, error } = await createClient()
      .from('permissions')
      .select('*')
      .order('module, action')
    
    if (error) {
      console.error('Error fetching permissions:', error)
      throw error
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getAllPermissions:', error)
    throw error
  }
}

/**
 * Get permissions for a specific role
 */
export async function getRolePermissions(roleId: string): Promise<Permission[]> {
  try {
    const { data, error } = await createClient()
      .from('role_permissions')
      .select(`
        permissions (
          id,
          module,
          action,
          description,
          created_at
        )
      `)
      .eq('role_id', roleId)
    
    if (error) {
      console.error('Error fetching role permissions:', error)
      throw error
    }
    
    return data?.map((item: any) => item.permissions).filter(Boolean) as Permission[] || []
  } catch (error) {
    console.error('Error in getRolePermissions:', error)
    throw error
  }
}

/**
 * Fetches permissions for a list of role IDs and returns them as a map.
 * @param roleIds - An array of role IDs.
 * @returns A promise that resolves to a map where keys are role IDs and values are arrays of permissions.
 */
export async function getAllRolePermissionsMapForRoleIds(roleIds: string[]): Promise<{ [roleId: string]: Permission[] }> {
  if (roleIds.length === 0) {
    return {};
  }
  try {
    const { data, error } = await createClient()
      .from('role_permissions')
      .select(`
        role_id,
        permissions (
          id,
          module,
          action,
          description,
          created_at
        )
      `)
      .in('role_id', roleIds);

    if (error) {
      console.error('Error fetching all role permissions map:', error);
      throw error;
    }

    const rolePermsMap: { [roleId: string]: Permission[] } = {};
    data?.forEach((item: any) => {
      if (!item.role_id || !item.permissions) return; // Skip if role_id or the joined permission is null

      if (!rolePermsMap[item.role_id]) {
        rolePermsMap[item.role_id] = [];
      }
      // 'item.permissions' is a single Permission object here due to the Supabase join syntax
      rolePermsMap[item.role_id].push(item.permissions as Permission);
    });
    
    // Ensure all requested roleIds have an entry in the map, even if they have no permissions
    roleIds.forEach(id => {
      if (!rolePermsMap[id]) {
        rolePermsMap[id] = [];
      }
    });

    return rolePermsMap;
  } catch (error) {
    console.error('Error in getAllRolePermissionsMapForRoleIds:', error);
    throw error;
  }
}

/**
 * Create a new user profile (called after Supabase Auth signup)
 */
export async function createUserProfile(
  userId: string,
  name: string,
  department?: string
): Promise<void> {
  try {
    const { error } = await createClient()
      .from('user_profiles')
      .insert({
        id: userId,
        name,
        department,
        status: 'pending'
      })
    
    if (error) {
      console.error('Error creating user profile:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in createUserProfile:', error)
    throw error
  }
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  user: ExtendedUser,
  module: string,
  action: string
): boolean {
  return user.permissions.some(
    permission => permission.module === module && permission.action === action
  )
}

/**
 * Check if user has any of the specified roles
 */
export function hasRole(user: ExtendedUser, roleNames: string[]): boolean {
  return user.roles.some(role => roleNames.includes(role.name))
}

/**
 * Get user's primary role (first role alphabetically)
 */
export function getPrimaryRole(user: ExtendedUser): string | null {
  if (user.roles.length === 0) return null
  return user.roles.sort((a, b) => a.name.localeCompare(b.name))[0].name
}