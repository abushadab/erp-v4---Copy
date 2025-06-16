// Supabase Database Types for User Management

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          name: string
          department: string | null
          status: 'active' | 'inactive' | 'pending' | 'suspended'
          avatar_url: string | null
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          department?: string | null
          status?: 'active' | 'inactive' | 'pending' | 'suspended'
          avatar_url?: string | null
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          department?: string | null
          status?: 'active' | 'inactive' | 'pending' | 'suspended'
          avatar_url?: string | null
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          name: string
          description: string | null
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      permissions: {
        Row: {
          id: string
          module: string
          action: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          module: string
          action: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          module?: string
          action?: string
          description?: string | null
          created_at?: string
        }
      }
      role_permissions: {
        Row: {
          role_id: string
          permission_id: string
          created_at: string | null
        }
        Insert: {
          role_id: string
          permission_id: string
          created_at?: string | null
        }
        Update: {
          role_id?: string
          permission_id?: string
          created_at?: string | null
        }
      }
      user_roles: {
        Row: {
          user_id: string
          role_id: string
          created_at: string | null
        }
        Insert: {
          user_id: string
          role_id: string
          created_at?: string | null
        }
        Update: {
          user_id?: string
          role_id?: string
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_last_login: {
        Args: {
          user_id: string
        }
        Returns: undefined
      }
      get_user_with_permissions: {
        Args: {
          user_id: string
        }
        Returns: {
          id: string
          name: string
          email: string
          department: string | null
          status: string
          avatar_url: string | null
          last_login: string | null
          created_at: string
          updated_at: string
          roles: {
            id: string
            name: string
            description: string | null
          }[]
          permissions: {
            id: string
            module: string
            action: string
            description: string | null
          }[]
        }[]
      }
      get_all_users_with_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          email: string
          department: string | null
          status: string
          avatar_url: string | null
          last_login: string | null
          created_at: string
          updated_at: string
          primary_role: string | null
          roles: {
            id: string
            name: string
            description: string | null
          }[]
          permissions: {
            id: string
            module: string
            action: string
            description: string | null
          }[]
        }[]
      }
      assign_role_to_user: {
        Args: {
          user_id: string
          role_id: string
        }
        Returns: undefined
      }
      remove_role_from_user: {
        Args: {
          user_id: string
          role_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Extended User type that combines Supabase Auth with our profile data
export interface ExtendedUser {
  id: string
  email: string
  name: string
  department: string | null
  status: 'active' | 'inactive' | 'pending' | 'suspended'
  avatar_url: string | null
  last_login: string | null
  created_at: string
  updated_at: string
  roles: Role[]
  permissions: { module: string; action: string }[]
  primary_role?: string
}

export interface Role {
  id: string
  name: string
  description: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  module: string
  action: string
  description: string | null
  created_at: string
}

export interface UserRole {
  user_id: string
  role_id: string
  created_at: string | null
}

export interface RolePermission {
  role_id: string
  permission_id: string
  created_at: string | null
}

// Helper types for API responses
export type UserWithRoles = Database['public']['Functions']['get_user_with_permissions']['Returns'][0]
export type AllUsersWithRoles = Database['public']['Functions']['get_all_users_with_roles']['Returns'][0]

// Permission modules and actions
export const PERMISSION_MODULES = [
  'users',
  'products', 
  'sales',
  'purchases',
  'inventory',
  'reports',
  'settings',
  'accounting'
] as const

export const PERMISSION_ACTIONS = [
  'create',
  'read', 
  'update',
  'delete',
  'export'
] as const

export type PermissionModule = typeof PERMISSION_MODULES[number]
export type PermissionAction = typeof PERMISSION_ACTIONS[number]