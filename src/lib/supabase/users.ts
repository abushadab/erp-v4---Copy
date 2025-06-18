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

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get a specific user with their roles and permissions (with caching)
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
  
  // If there's already a request in progress, wait for it
  if (cached?.promise) {
    console.log('⏳ Request already in progress for user:', userId, '- waiting for existing promise...');
    return await cached.promise;
  }
  
  // Create new request promise
  const requestPromise = (async (): Promise<ExtendedUser | null> => {
    try {
      console.log('🔄 Fetching fresh user permissions data from API for:', userId);
      
      const { data, error } = await createClient().rpc('get_user_with_permissions', {
        user_id: userId
      });
      
      if (error) {
        console.error('Error fetching user:', error);
        throw error;
      }
      
      const result = data?.[0] || null;
      
      // Update cache with result
      userPermissionsCache.set(userId, {
        data: result,
        timestamp: now,
        promise: undefined
      });
      
      console.log('✅ User permissions data fetched and cached for:', userId);
      return result;
    } catch (error) {
      // Remove the promise from cache on error so next call can retry
      const currentCached = userPermissionsCache.get(userId);
      if (currentCached) {
        userPermissionsCache.set(userId, {
          ...currentCached,
          promise: undefined
        });
      }
      
      console.error('❌ Error in getUserWithPermissions for user:', userId, error);
      throw error;
    }
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
    console.log('🗑️ Clearing user permissions cache for:', userId);
    userPermissionsCache.delete(userId);
  } else {
    console.log('🗑️ Clearing all user permissions cache');
    userPermissionsCache.clear();
  }
}

/**
 * Update user profile information
 */
export async function updateUserProfile(
  userId: string, 
  updates: Partial<Database['public']['Tables']['user_profiles']['Update']>
): Promise<void> {
  try {
    const { error } = await createClient()
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
    
    if (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in updateUserProfile:', error)
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
    
    return data?.map(item => item.permissions).filter(Boolean) as Permission[] || []
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
    data?.forEach(item => {
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