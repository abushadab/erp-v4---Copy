'use client'

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
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
  Trash2,
  Mail,
  Building,
  AlertCircle,
  User,
  Eye,
  Edit,
  Loader2
} from "lucide-react"
import { type User as UserType } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { NotificationContainer } from "@/components/ui/notification"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  useUsersData, 
  useUserManagement, 
  useUserPermissions, 
  useUserFilters 
} from '@/hooks/users'
import { 
  AddUserModal, 
  UserSummaryCards, 
  UserFilters 
} from '@/components/users'
import { 
  getRoleColor, 
  getStatusColor, 
  formatLastLogin, 
  formatJoinDate,
  getUserInitials,
  formatRoleName,
  getRoleIcon,
  getStatusIcon
} from '@/lib/utils/userFormatters'

export default function UsersPage() {
  // Use our extracted hooks
  const { users, loading, refreshData } = useUsersData()
  const { updateUser, deleteUser, isEditingUser, isDeletingUser } = useUserManagement()
  const { permissions, getUserActionPermissions, currentUserId } = useUserPermissions()
  const { 
    searchTerm, 
    selectedRoles, 
    selectedStatuses, 
    hasActiveFilters,
    setSearchTerm,
    toggleRole,
    toggleStatus,
    clearFilters,
    filteredUsers 
  } = useUserFilters()

  // Modal states
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<UserType | null>(null)

  // Edit user state
  const [editUser, setEditUser] = React.useState<UserType & { permissions: string[] }>({
    id: '',
    name: '',
    email: '',
    role: 'manager',
    department: '',
    status: 'active',
    avatar: '',
    joinDate: new Date().toISOString(),
    permissions: []
  })

  const { notifications, removeNotification, success } = useToast()

  const handleRefresh = async () => {
    await refreshData()
    success({
      title: "Data Refreshed",
      description: "Users data has been refreshed successfully.",
    })
  }

  const handleUserSuccess = () => {
    refreshData()
  }

  // Initialize edit form when a user is selected
  React.useEffect(() => {
    if (selectedUser && isEditDialogOpen) {
      setEditUser({
        id: selectedUser.id,
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role,
        department: selectedUser.department,
        status: selectedUser.status,
        avatar: selectedUser.avatar || '',
        joinDate: selectedUser.joinDate,
        permissions: selectedUser.permissions || [],
      })
    }
  }, [selectedUser, isEditDialogOpen])

  // Handle edit user form changes
  const handleEditUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditUser(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle updating a user
  const handleUpdateUser = async () => {
    if (!selectedUser || !editUser.name || !editUser.email) {
      return
    }
    
    await updateUser(editUser, selectedUser, () => {
      setIsEditDialogOpen(false)
      handleUserSuccess()
    })
  }

  // Handle deleting a user
  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    await deleteUser(selectedUser, () => {
      setIsDeleteDialogOpen(false)
      handleUserSuccess()
    })
  }

  // Get filtered users from our hook
  const displayUsers = filteredUsers(users)

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Table Skeleton */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead className="hidden sm:table-cell"><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableHead>
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
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Skeleton className="h-8 w-8" />
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
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        {permissions.canCreateUsers ? (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        ) : (
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <UserSummaryCards users={users} />

      {/* Filters and Search */}
      <UserFilters
        searchTerm={searchTerm}
        selectedRoles={selectedRoles}
        selectedStatuses={selectedStatuses}
        onSearchChange={setSearchTerm}
        onRoleToggle={toggleRole}
        onStatusToggle={toggleStatus}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* View User Modal */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View detailed information about this user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center text-white text-2xl font-semibold">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} className="w-24 h-24 rounded-full" />
                  ) : (
                    selectedUser.name.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Name</h4>
                  <p>{selectedUser.name}</p>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
                  <p>{selectedUser.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Role</h4>
                  <Badge className={`${getRoleColor(selectedUser.role)} mt-1`} variant="outline">
                    <span className="mr-1">{getRoleIcon(selectedUser.role)}</span> {selectedUser.role}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                  <Badge className="mt-1" variant={getStatusColor(selectedUser.status as 'active' | 'inactive' | 'pending')}>
                    {(() => {
                      const StatusIcon = getStatusIcon(selectedUser.status)
                      return <StatusIcon className="h-3 w-3 mr-1" />
                    })()}
                    {selectedUser.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Department</h4>
                  <p>{selectedUser.department}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Join Date</h4>
                  <p>{formatJoinDate(selectedUser.joinDate)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Last Login</h4>
                  <p>{formatLastLogin(selectedUser.lastLogin)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Permissions</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedUser.permissions && selectedUser.permissions.length > 0 ? (
                    selectedUser.permissions.map((permission, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific permissions</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={editUser.name}
                  onChange={handleEditUserChange}
                  placeholder="Full Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  value={editUser.email}
                  onChange={handleEditUserChange}
                  placeholder="Email Address"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  name="role" 
                  value={editUser.role} 
                  onValueChange={(value) => setEditUser(prev => ({ ...prev, role: value as UserType['role'] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  name="department"
                  value={editUser.department}
                  onChange={handleEditUserChange}
                  placeholder="Department"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  name="status" 
                  value={editUser.status} 
                  onValueChange={(value) => setEditUser(prev => ({ ...prev, status: value as UserType['status'] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-avatar">Avatar URL (Optional)</Label>
                <Input
                  id="edit-avatar"
                  name="avatar"
                  value={editUser.avatar}
                  onChange={handleEditUserChange}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUser} disabled={isEditingUser}>
              {isEditingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete User Modal */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white font-semibold">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} className="w-12 h-12 rounded-full" />
                  ) : (
                    selectedUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-medium">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <Badge className={`${getRoleColor(selectedUser.role)}`}>
                  {selectedUser.role}
                </Badge>
                <Badge variant={getStatusColor(selectedUser.status as 'active' | 'inactive' | 'pending')}>
                  {selectedUser.status}
                </Badge>
              </div>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Deleting this user will remove all associated data and permissions.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeletingUser || selectedUser?.id === currentUserId}>
              {isDeletingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Users Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {displayUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden md:table-cell">Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Department</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
        {displayUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-semibold flex-shrink-0">
                {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center">
                  <Mail className="h-3 w-3 mr-1" />
                  {user.email}
                              <span className="sm:hidden ml-2">
                                • {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                </div>
                  </div>
                  </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className={`${getRoleColor(user.role)}`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
              <Badge variant={getStatusColor(user.status)}>
                          {user.status}
              </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Building className="h-3 w-3 mr-1" />
                          {user.department}
            </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatLastLogin(user.lastLogin)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(() => {
                            const actionPermissions = getUserActionPermissions(user)
                            return (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setIsViewDialogOpen(true)
                                  }}
                                  disabled={!actionPermissions.canView}
                                  title={actionPermissions.reason || 'View user details'}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setIsEditDialogOpen(true)
                                  }}
                                  disabled={!actionPermissions.canEdit}
                                  title={actionPermissions.reason || 'Edit user'}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-600 hover:text-red-800"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setIsDeleteDialogOpen(true)
                                  }}
                                  disabled={!actionPermissions.canDelete}
                                  title={actionPermissions.reason || 'Delete user'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </div>
          ) : (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || selectedRoles.length < 6 || selectedStatuses.length < 3
                  ? "Try adjusting your search or filters" 
                  : "Get started by adding your first user"}
              </p>
              <Button 
                variant="outline" 
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            </div>
          )}
            </CardContent>
          </Card>
      
      {/* Add User Modal */}
      <AddUserModal
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleUserSuccess}
        existingUsers={users}
      />

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