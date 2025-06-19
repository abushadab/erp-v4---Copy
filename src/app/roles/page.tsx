'use client'

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Plus, 
  Search, 
  Shield,
  Trash2,
  Settings,
  MoreHorizontal,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Edit
} from "lucide-react"
import {
  getAllUsersWithRoles,
  getAllRoles,
  getAllPermissions,
  getRolePermissions,
  getAllRolePermissionsMapForRoleIds,
  assignRoleToUser,
  removeRoleFromUser,
  updateUserProfile
} from "@/lib/supabase/users";
import { getUserWithPermissions } from "../../lib/supabase/users";
import {
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
  type Role,
  type Permission
} from "@/lib/types/supabase-types"
import { useToast } from "@/hooks/use-toast"
import { NotificationContainer } from "@/components/ui/notification"
import { createClient } from '@/lib/supabase/client';
import type { ExtendedUser } from '@/lib/types/supabase-types';

// Always use Supabase for data

// Simple in-memory cache to avoid duplicate API calls during React Strict Mode remounts
const dataCache = {
  roles: null as Role[] | null,
  permissions: null as Permission[] | null,
  rolePermissions: null as { [roleId: string]: Permission[] } | null,
  lastFetch: 0,
  currentRequest: null as Promise<void> | null,
}
const CACHE_DURATION = 30_000 // 30 seconds



export default function RolesPage() {
  const [roles, setRoles] = React.useState<Role[]>([])
  const [permissions, setPermissions] = React.useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = React.useState<{ [roleId: string]: Permission[] }>({})

  const [searchTerm, setSearchTerm] = React.useState("")
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = React.useState<string | null>(null);
  const [currentUserPermissions, setCurrentUserPermissions] = React.useState<Permission[]>([]);

  // Derived roles list based on search term
  const filteredRoles = React.useMemo(() => {
    if (!searchTerm.trim()) return roles
    const term = searchTerm.toLowerCase()
    return roles.filter(r =>
      r.name.toLowerCase().includes(term) ||
      (r.description ?? "").toLowerCase().includes(term)
    )
  }, [roles, searchTerm])
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null)
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = React.useState(false)
  
  // Loading states
  const [loading, setLoading] = React.useState(true)
  const [isAddingRole, setIsAddingRole] = React.useState(false)
  const [isEditingRole, setIsEditingRole] = React.useState(false)
  const [isDeletingRole, setIsDeletingRole] = React.useState(false)
  const [isUpdatingPermissions, setIsUpdatingPermissions] = React.useState(false)
  
  // Form states
  const [newRole, setNewRole] = React.useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive'
  })
  
  const [editRole, setEditRole] = React.useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive'
  })
  
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([])
  
  const { toast, notifications, removeNotification } = useToast()
  
  // Load data on component mount
  React.useEffect(() => {
    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);
        getUserWithPermissions(session.user.id).then((userData: ExtendedUser | null) => {
          if (userData) {
            setCurrentUserRole(userData.roles?.[0]?.name || null);
            const userPerms = userData.permissions || [];
            const fullUserPermissions = permissions.filter(p => 
              userPerms.some(up => up.module === p.module && up.action === p.action)
            );
            setCurrentUserPermissions(fullUserPermissions);
          }
        });
      } else {
        setCurrentUserId(null);
        setCurrentUserRole(null);
        setCurrentUserPermissions([]);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async (forceRefresh: boolean = false) => {
    const now = Date.now()

    // Use cache if available
    if (!forceRefresh &&
        dataCache.roles &&
        dataCache.permissions &&
        dataCache.rolePermissions &&
        (now - dataCache.lastFetch) < CACHE_DURATION) {
      setRoles(dataCache.roles)
      setPermissions(dataCache.permissions)
      setRolePermissions(dataCache.rolePermissions)
      setLoading(false)
      return
    }

    // If another request is in-flight, wait for it
    if (dataCache.currentRequest) {
      await dataCache.currentRequest
      setRoles(dataCache.roles || [])
      setPermissions(dataCache.permissions || [])
      setRolePermissions(dataCache.rolePermissions || {})
      setLoading(false)
      return
    }

    dataCache.currentRequest = (async () => {
      try {
        setLoading(true)
        let rolesData: Role[] = []
        let permissionsData: Permission[] = []
        let rolePerms: { [roleId: string]: Permission[] } = {}

        ;[rolesData, permissionsData] = await Promise.all([
          getAllRoles(),
          getAllPermissions(),
        ])

        // Fetch permissions for all fetched roles efficiently
        if (rolesData.length > 0) {
          const roleIds = rolesData.map(role => role.id);
          rolePerms = await getAllRolePermissionsMapForRoleIds(roleIds);
        }
        setRolePermissions(rolePerms)

        // Update cache
        dataCache.roles = rolesData
        dataCache.permissions = permissionsData
        dataCache.rolePermissions = rolePerms
        dataCache.lastFetch = now

        // Set state
        setRoles(rolesData)
        setPermissions(permissionsData)
      } catch (error) {
        console.error('Error loading data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load roles and permissions data.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
        dataCache.currentRequest = null
      }
    })()

    await dataCache.currentRequest
  }

  const handleNewRoleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewRole(prev => ({ ...prev, [name]: value }))
  }
  
  // Handle edit role form changes
  const handleEditRoleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditRole(prev => ({ ...prev, [name]: value }))
  }
  
  // Handle add role
  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingRole(true)
    
    try {
      // TODO: Implement Supabase role creation
      toast({
        title: "Info",
        description: "Role creation not yet implemented.",
        variant: "default"
      })
      
      setNewRole({ name: '', description: '', status: 'active' })
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error('Error adding role:', error)
      toast({
        title: "Error",
        description: "Failed to create role.",
        variant: "destructive"
      })
    } finally {
      setIsAddingRole(false)
    }
  }
  
  // Handle edit role
  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return
    
    setIsEditingRole(true)
    
    try {
      // TODO: Implement Supabase role update
      toast({
        title: "Info",
        description: "Role update not yet implemented.",
        variant: "default"
      })
      
      setIsEditDialogOpen(false)
      setSelectedRole(null)
    } catch (error) {
      console.error('Error updating role:', error)
      toast({
        title: "Error",
        description: "Failed to update role.",
        variant: "destructive"
      })
    } finally {
      setIsEditingRole(false)
    }
  }
  
  // Handle delete role
  const handleDeleteRole = async () => {
    if (!selectedRole) return
    
    setIsDeletingRole(true)
    
    try {
      // TODO: Implement Supabase role deletion
      toast({
        title: "Info",
        description: "Role deletion not yet implemented.",
        variant: "default"
      })
      
      setIsDeleteDialogOpen(false)
      setSelectedRole(null)
    } catch (error) {
      console.error('Error deleting role:', error)
      toast({
        title: "Error",
        description: "Failed to delete role.",
        variant: "destructive"
      })
    } finally {
      setIsDeletingRole(false)
    }
  }
  
  // Handle permission changes
  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setSelectedPermissions(prev => 
      checked 
        ? [...prev, permissionId]
        : prev.filter(id => id !== permissionId)
    )
  }
  
  // Handle update role permissions
  const handleUpdatePermissions = async () => {
    if (!selectedRole) return
    
    setIsUpdatingPermissions(true)
    
    try {
      // TODO: Implement Supabase permission update
      toast({
        title: "Info",
        description: "Permission update not yet implemented.",
        variant: "default"
      })
      
      setIsPermissionsDialogOpen(false)
      setSelectedRole(null)
    } catch (error) {
      console.error('Error updating permissions:', error)
      toast({
        title: "Error",
        description: "Failed to update role permissions.",
        variant: "destructive"
      })
    } finally {
      setIsUpdatingPermissions(false)
    }
  }
  
  // Open edit dialog
  const openEditDialog = (role: Role) => {
    setSelectedRole(role)
    setEditRole({
      name: role.name,
      description: role.description || '',
      status: role.status
    })
    setIsEditDialogOpen(true)
  }
  
  // Open permissions dialog
  const openPermissionsDialog = (role: Role) => {
    setSelectedRole(role)
    const currentPermissions = rolePermissions[role.id] || []
    setSelectedPermissions(currentPermissions.map(p => p.id))
    setIsPermissionsDialogOpen(true)
  }
  
  // Open delete dialog
  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role)
    setIsDeleteDialogOpen(true)
  }
  
  // Open view dialog
  const openViewDialog = (role: Role) => {
    setSelectedRole(role)
    setIsViewDialogOpen(true)
  }
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'inactive':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    }
  }
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }
  
  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as { [module: string]: Permission[] })
  
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
            <p className="text-muted-foreground">
              Manage system roles and permissions
            </p>
          </div>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        </div>

        {/* Search Skeleton */}
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 flex-1 max-w-md" />
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead className="hidden sm:table-cell"><Skeleton className="h-4 w-12" /></TableHead>
                    <TableHead className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground">
            Manage system roles and permissions
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Role</DialogTitle>
              <DialogDescription>
                Create a new role with specific permissions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddRole}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={newRole.name}
                    onChange={handleNewRoleChange}
                    className="col-span-3"
                    placeholder="Enter role name"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={newRole.description}
                    onChange={handleNewRoleChange}
                    className="col-span-3"
                    placeholder="Enter role description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <Select name="status" value={newRole.status} onValueChange={(value) => setNewRole(prev => ({ ...prev, status: value as 'active' | 'inactive' }))}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isAddingRole}>
                  {isAddingRole ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Role'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      

      
      {/* Search and Filters */}
      <div className="flex items-center space-x-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      {/* Roles Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {filteredRoles.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Permissions</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role) => (
                    <TableRow key={role.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Shield className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium capitalize">{role.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {role.description}
                              <span className="sm:hidden ml-2">
                                • {role.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className={getStatusColor(role.status)} variant="outline">
                          {getStatusIcon(role.status)}
                          <span className="ml-1">{role.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm">
                          <span className="font-medium">{(rolePermissions[role.id] || []).length}</span>
                          <span className="text-muted-foreground ml-1">permissions</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(role.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewDialog(role)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openEditDialog(role)}
                                disabled={role.name.toLowerCase() === 'administrator' || role.name.toLowerCase() === 'super admin'}
                                title={(role.name.toLowerCase() === 'administrator' || role.name.toLowerCase() === 'super admin') ? `${role.name} role cannot be edited` : undefined}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Role
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => openPermissionsDialog(role)}
                                disabled={role.name.toLowerCase() === 'administrator' || role.name.toLowerCase() === 'super admin'}
                                title={(role.name.toLowerCase() === 'administrator' || role.name.toLowerCase() === 'super admin') ? `${role.name} permissions cannot be managed` : undefined}
                              >
                                <Settings className="mr-2 h-4 w-4" />
                                Manage Permissions
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(role)}
                                className="text-red-600"
                                disabled={role.name.toLowerCase() === 'administrator' || role.name.toLowerCase() === 'super admin'}
                                title={(role.name.toLowerCase() === 'administrator' || role.name.toLowerCase() === 'super admin') ? `${role.name} role cannot be deleted` : undefined}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Role
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No roles found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new role.'}
              </p>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Role
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* View Role Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Role Details</DialogTitle>
            <DialogDescription>
              View role information and permissions
            </DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Name</h4>
                  <p className="capitalize">{selectedRole.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                  <Badge className={getStatusColor(selectedRole.status)} variant="outline">
                    {getStatusIcon(selectedRole.status)}
                    <span className="ml-1">{selectedRole.status}</span>
                  </Badge>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p>{selectedRole.description || 'No description provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Created</h4>
                  <p>{new Date(selectedRole.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Last Updated</h4>
                  <p>{new Date(selectedRole.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Permissions ({(rolePermissions[selectedRole.id] || []).length})</h4>
                <div className="space-y-3">
                  {Object.entries(groupedPermissions).map(([module, modulePermissions]) => {
                    const rolePerms = rolePermissions[selectedRole.id] || []
                    const moduleRolePerms = modulePermissions.filter(p => rolePerms.some(rp => rp.id === p.id))
                    
                    if (moduleRolePerms.length === 0) return null
                    
                    return (
                      <div key={module} className="border rounded-lg p-3">
                        <h5 className="font-medium capitalize mb-2">{module}</h5>
                        <div className="flex flex-wrap gap-2">
                          {moduleRolePerms.map((permission) => (
                            <Badge key={permission.id} variant="secondary">
                              {permission.action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditRole}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={editRole.name}
                  onChange={handleEditRoleChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  value={editRole.description}
                  onChange={handleEditRoleChange}
                  className="col-span-3"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  Status
                </Label>
                <Select name="status" value={editRole.status} onValueChange={(value) => setEditRole(prev => ({ ...prev, status: value as 'active' | 'inactive' }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isEditingRole}>
                {isEditingRole ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Role'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Role Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="py-4">
              <div className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium capitalize">{selectedRole.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedRole.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {(rolePermissions[selectedRole.id] || []).length} permissions
                  </p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Warning
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      Deleting this role will remove it from all users who currently have this role assigned.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole} disabled={isDeletingRole}>
              {isDeletingRole ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Manage Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Role Permissions</DialogTitle>
            <DialogDescription>
              Select permissions for {selectedRole?.name} role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
              <div key={module} className="border rounded-lg p-4">
                <h3 className="font-medium capitalize mb-3">{module}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {modulePermissions.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.includes(permission.id)}
                        onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                        disabled={currentUserRole?.toLowerCase() !== 'super admin' && !currentUserPermissions.some(p => p.id === permission.id)}
                        title={currentUserRole?.toLowerCase() !== 'super admin' && !currentUserPermissions.some(p => p.id === permission.id) ? 'You do not have this permission to grant/revoke' : undefined}
                      />
                      <Label htmlFor={permission.id} className="text-sm">
                        <span className="font-medium capitalize">{permission.action}</span>
                        {permission.description && (
                          <span className="text-muted-foreground ml-1">- {permission.description}</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePermissions} disabled={isUpdatingPermissions}>
              {isUpdatingPermissions ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Permissions'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Toast Notifications */}
      {notifications.length > 0 && (
        <NotificationContainer 
          notifications={notifications} 
          onDismiss={removeNotification} 
          position="top-right" 
        />
      )}
    </div>
  )
}