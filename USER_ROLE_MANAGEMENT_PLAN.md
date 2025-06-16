# User and Role Management System Implementation Plan

## Current State Analysis

### Existing Implementation
- **Users Page**: Located at `/src/app/users/page.tsx` - fully functional UI but uses mock data
- **Mock Data**: Basic User interface with limited fields (id, name, email, role, avatar)
- **Expected Fields**: The UI expects extended fields (status, department, lastLogin, permissions, joinDate)
- **Authentication**: Supabase Auth is implemented with SSR support
- **Database**: No user management tables in current Supabase schema

### Current User Interface (Mock Data)
```typescript
interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'employee'
  avatar?: string
}
```

### Expected User Interface (Based on UI)
```typescript
interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'sales' | 'warehouse' | 'accountant'
  status: 'active' | 'inactive' | 'suspended'
  department: string
  joinDate: string
  lastLogin?: string
  permissions: string[]
  avatar?: string
}
```

## Implementation Strategy

### Phase 1: Database Schema Design

#### 1.1 User Profiles Table
Create a `user_profiles` table to extend Supabase Auth users:

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  avatar_url TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 1.2 Roles and Permissions System

**Roles Table:**
```sql
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Permissions Table:**
```sql
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  module TEXT NOT NULL, -- e.g., 'products', 'sales', 'purchases'
  action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Role Permissions Junction Table:**
```sql
CREATE TABLE role_permissions (
  role_id TEXT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
```

**User Roles Junction Table:**
```sql
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id TEXT REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (user_id, role_id)
);
```

### Phase 2: Database Functions and Triggers

#### 2.1 Auto-create Profile Trigger
```sql
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
```

#### 2.2 Update Last Login Function
```sql
CREATE OR REPLACE FUNCTION update_last_login(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET last_login = NOW(), updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
```

#### 2.3 Get User with Roles and Permissions
```sql
CREATE OR REPLACE FUNCTION get_user_with_permissions(user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', up.id,
    'name', up.name,
    'email', au.email,
    'department', up.department,
    'status', up.status,
    'avatar_url', up.avatar_url,
    'last_login', up.last_login,
    'created_at', up.created_at,
    'roles', COALESCE(roles_array, '[]'::json),
    'permissions', COALESCE(permissions_array, '[]'::json)
  ) INTO result
  FROM user_profiles up
  JOIN auth.users au ON up.id = au.id
  LEFT JOIN (
    SELECT 
      ur.user_id,
      json_agg(json_build_object('id', r.id, 'name', r.name)) as roles_array
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_id
    GROUP BY ur.user_id
  ) user_roles_data ON up.id = user_roles_data.user_id
  LEFT JOIN (
    SELECT 
      ur.user_id,
      json_agg(DISTINCT p.name) as permissions_array
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_id
    GROUP BY ur.user_id
  ) user_permissions_data ON up.id = user_permissions_data.user_id
  WHERE up.id = user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### Phase 3: TypeScript Types and Interfaces

#### 3.1 Update User Types
```typescript
// src/types/user.ts
export interface UserProfile {
  id: string
  name: string
  email: string
  department?: string
  status: 'active' | 'inactive' | 'suspended'
  avatar_url?: string
  last_login?: string
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: string
  description?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  name: string
  description?: string
  module: string
  action: string
  created_at: string
}

export interface UserWithRoles extends UserProfile {
  roles: Role[]
  permissions: string[]
}

// For compatibility with existing UI
export interface User {
  id: string
  name: string
  email: string
  role: string // Primary role name
  status: 'active' | 'inactive' | 'suspended'
  department: string
  joinDate: string
  lastLogin?: string
  permissions: string[]
  avatar?: string
}
```

### Phase 4: Supabase Integration

#### 4.1 Database Queries
```typescript
// src/lib/supabase/users.ts
import { createClient } from '@/lib/supabase/server'
import type { User, UserProfile, UserWithRoles } from '@/types/user'

export async function getUsers(): Promise<User[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      *,
      user_roles!inner(
        roles(
          id,
          name
        )
      )
    `)
  
  if (error) throw error
  
  return data.map(transformToUser)
}

export async function getUserWithPermissions(userId: string): Promise<UserWithRoles> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .rpc('get_user_with_permissions', { user_id: userId })
  
  if (error) throw error
  return data
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function assignRoleToUser(userId: string, roleId: string, assignedBy: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role_id: roleId,
      assigned_by: assignedBy
    })
  
  if (error) throw error
}

function transformToUser(profile: any): User {
  const primaryRole = profile.user_roles?.[0]?.roles?.name || 'employee'
  
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email || '',
    role: primaryRole,
    status: profile.status,
    department: profile.department || '',
    joinDate: profile.created_at,
    lastLogin: profile.last_login,
    permissions: [], // Will be populated separately
    avatar: profile.avatar_url
  }
}
```

#### 4.2 Row Level Security (RLS)
```sql
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Similar policies for other tables...
```

### Phase 5: Frontend Integration

#### 5.1 Update Users Page
```typescript
// src/app/users/page.tsx
import { getUsers } from '@/lib/supabase/users'
import { UsersList } from '@/components/users/users-list'

export default async function UsersPage() {
  const users = await getUsers()
  
  return (
    <div className="flex-1 space-y-6 p-6">
      <UsersList users={users} />
    </div>
  )
}
```

#### 5.2 Create User Management Components
```typescript
// src/components/users/user-form.tsx
// src/components/users/role-assignment.tsx
// src/components/users/permission-matrix.tsx
```

### Phase 6: Seed Data

#### 6.1 Default Roles
```sql
INSERT INTO roles (id, name, description) VALUES
('admin', 'Administrator', 'Full system access'),
('manager', 'Manager', 'Management level access'),
('sales', 'Sales Representative', 'Sales module access'),
('warehouse', 'Warehouse Staff', 'Inventory management access'),
('accountant', 'Accountant', 'Financial data access');
```

#### 6.2 Default Permissions
```sql
INSERT INTO permissions (id, name, module, action) VALUES
('products.create', 'Create Products', 'products', 'create'),
('products.read', 'View Products', 'products', 'read'),
('products.update', 'Update Products', 'products', 'update'),
('products.delete', 'Delete Products', 'products', 'delete'),
('sales.create', 'Create Sales', 'sales', 'create'),
('sales.read', 'View Sales', 'sales', 'read'),
-- ... more permissions
```

## Implementation Timeline

### Week 1: Database Setup
- [ ] Create database schema
- [ ] Implement triggers and functions
- [ ] Set up RLS policies
- [ ] Add seed data

### Week 2: Backend Integration
- [ ] Create TypeScript types
- [ ] Implement Supabase queries
- [ ] Create API functions
- [ ] Test database operations

### Week 3: Frontend Integration
- [ ] Update users page to use real data
- [ ] Create user management components
- [ ] Implement role assignment UI
- [ ] Add permission management

### Week 4: Testing and Polish
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Security review

## Security Considerations

1. **Row Level Security**: Implement proper RLS policies
2. **Role-based Access**: Ensure users can only access appropriate data
3. **Audit Trail**: Track role assignments and permission changes
4. **Input Validation**: Validate all user inputs
5. **Session Management**: Proper session handling with Supabase Auth

## Migration Strategy

1. **Backward Compatibility**: Keep existing mock data structure working
2. **Gradual Migration**: Phase out mock data gradually
3. **Data Migration**: Script to migrate any existing user data
4. **Feature Flags**: Use feature flags to toggle between mock and real data

## Next Steps

1. Review and approve this plan
2. Set up development branch
3. Begin Phase 1 implementation
4. Coordinate with Cursor AI on parallel development

This plan provides a comprehensive approach to implementing a robust User and Role Management system that integrates seamlessly with the existing ERP application and Supabase infrastructure.