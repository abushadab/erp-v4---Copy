'use client'

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
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
  Trash2,
  Shield,
  Mail,
  Building,
  Loader2,
  AlertCircle,
  User,
  UserCheck,
  UserX,
  Calendar,
  Filter,
  Eye,
  Edit
} from "lucide-react"
import { type User as UserType } from "@/lib/types"
import { getAllUsersWithRoles, createUserProfile, updateUserProfile, assignRoleToUser, removeRoleFromUser, getUserWithPermissions } from "@/lib/supabase/users"
import { createClient } from '@/lib/supabase/client'
import type { ExtendedUser } from "@/lib/types/supabase-types"
import { useToast } from "@/hooks/use-toast"
import { NotificationContainer } from "@/components/ui/notification"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Global data cache and request deduplication to prevent multiple API calls
const dataCache = {
  users: null as UserType[] | null,
  lastFetch: 0,
  isLoading: false,
  currentRequest: null as Promise<void> | null
}

const CACHE_DURATION = 30000 // 30 seconds

export default function UsersPage() {
  // Ref to track if initial load has been triggered
  const initialLoadTriggered = React.useRef(false)
  
  const [users, setUsers] = React.useState<UserType[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>(['super_admin', 'admin', 'manager', 'sales', 'warehouse', 'accountant'])
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>(['active', 'inactive', 'pending'])
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<UserType | null>(null)
  const [isAddingUser, setIsAddingUser] = React.useState(false)
  const [isEditingUser, setIsEditingUser] = React.useState(false)
  const [isDeletingUser, setIsDeletingUser] = React.useState(false)
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = React.useState<string | null>(null);
  const [newUser, setNewUser] = React.useState({
    name: '',
    email: '',
    role: 'manager',
    department: 'Operations',
    status: 'active',
    avatar: '',
    permissions: [] as string[]
  })
  
  // Add state for edit user form
  const [editUser, setEditUser] = React.useState<UserType & { permissions: string[] }>({
    id: '',
    name: '',
    email: '',
    role: 'manager',
    department: '',
    status: 'active',
    avatar: '',
    joinDate: new Date().toISOString(),
    permissions: [] as string[]
  })
  const { toast, success, notifications, removeNotification } = useToast();

  // Set current user ID using onAuthStateChange listener
  React.useEffect(() => {
    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);
        // Fetch user details to get the role (now with global caching)
        try {
          const userData = await getUserWithPermissions(session.user.id);
          if (userData) {
            setCurrentUserRole(userData.roles?.[0]?.name || null);
          }
        } catch (error) {
          console.error('Error fetching current user data:', error);
          setCurrentUserRole(null);
        }
      } else {
        setCurrentUserId(null);
        setCurrentUserRole(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Convert ExtendedUser to UserType for compatibility
  const convertSupabaseUser = (supabaseUser: ExtendedUser): UserType => {
    return {
      id: supabaseUser.id,
      name: supabaseUser.name,
      email: supabaseUser.email || '',
      // Use role ID (slug) instead of display name so it matches internal role enums
      role: (supabaseUser.roles[0]?.id || supabaseUser.primary_role?.toLowerCase() || 'sales') as UserType['role'],
      avatar: supabaseUser.avatar_url || undefined,
      status: supabaseUser.status as UserType['status'],
      department: supabaseUser.department || 'General',
      lastLogin: supabaseUser.last_login || undefined,
      joinDate: supabaseUser.created_at,
      permissions: supabaseUser.permissions.map(p => `${p.module}.${p.action}`)
    }
  }

  // Handler for new user form changes
  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handler for adding a new user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingUser(true);
    
    try {
      // Create user in Supabase
      // First create auth user (this would typically be done through Supabase Auth UI or API)
      // For demo purposes, we'll just create the profile
      await createUserProfile(
        // In a real app, this would be the ID returned from createUser
        `user_${Date.now()}`,
        newUser.name,
        newUser.department
      );

      // Refresh the user list using the cached function
      await loadUsersData(true);
      
      // Reset form and close dialog
      setNewUser({
        name: '',
        email: '',
        role: 'manager',
        department: 'Operations',
        status: 'active',
        avatar: '',
        permissions: []
      });
      setIsAddDialogOpen(false);
      
      // Show success message
      success({
        title: "User Created",
        description: `${newUser.name} has been added successfully.`,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingUser(false);
    }
  };
  
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
  const handleEditUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditUser(prev => ({
      ...prev,
      [name]: name === 'role' ? value as UserType['role'] : 
               name === 'status' ? value as UserType['status'] : 
               value
    }))
  }
  
  // Handle updating a user
  const handleUpdateUser = async () => {
    if (!editUser.name || !editUser.email) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      })
      return
    }
    
    setIsEditingUser(true)
    
    try {
      // Update user profile in Supabase
      await updateUserProfile(editUser.id, {
        name: editUser.name,
        department: editUser.department,
        status: editUser.status as UserType['status'],
        avatar_url: editUser.avatar || null,
      });

      // Update user role if changed
      if (selectedUser && selectedUser.role !== editUser.role) {
        // Remove old role
        await removeRoleFromUser(editUser.id, selectedUser.role);
        // Assign new role
        await assignRoleToUser(editUser.id, editUser.role);
      }

      // Refresh the user list using the cached function
      await loadUsersData(true);
      
      // Close dialog
      setIsEditDialogOpen(false)
      
      success({
        title: 'User Updated',
        description: 'The user has been successfully updated.',
      })
    } catch (error) {
      console.error('Error updating user:', error)
      toast({
        title: 'Error',
        description: 'There was an error updating the user. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsEditingUser(false)
    }
  }
  
  // Handle deleting a user
  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    setIsDeletingUser(true)
    
    try {
      // In a real app, you would use Supabase Auth to delete the user
      // For now, we'll just delete the profile
      // This is a placeholder implementation
      
      // First remove all roles from the user
      // This would typically be handled by a database trigger or function
      await removeRoleFromUser(selectedUser.id, selectedUser.role)
      
      // Then delete the user profile
      // This would need to be implemented in the Supabase functions
      // For now, we'll just refresh the user list
      
      // Refresh the user list using the cached function
      await loadUsersData(true);
      
      // Close dialog
      setIsDeleteDialogOpen(false)
      
      success({
        title: 'User Deleted',
        description: 'The user has been successfully deleted.',
      })
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: 'Error',
        description: 'There was an error deleting the user. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeletingUser(false)
    }
  }

  // Load users data function
  // Data loading function with enhanced request deduplication
  const loadUsersData = async (forceRefresh = false) => {
    const now = Date.now()
    
    console.log('🔍 loadUsersData called with forceRefresh:', forceRefresh)
    
    // Check cache first - only use cache if data exists and is fresh
    if (!forceRefresh && 
        dataCache.users && 
        (now - dataCache.lastFetch) < CACHE_DURATION) {
      console.log('📦 Using cached users data')
      setUsers(dataCache.users)
      setLoading(false)
      return
    }

    // If there's already a request in progress, wait for it
    if (dataCache.currentRequest) {
      console.log('⏳ Request already in progress, waiting for existing promise...')
      try {
        await dataCache.currentRequest
        // After the request completes, update state with cached data
        if (dataCache.users) {
          console.log('📦 Using data from completed request')
          setUsers(dataCache.users)
          setLoading(false)
        }
      } catch (error) {
        console.error('⚠️ Error in concurrent request:', error)
      }
      return
    }

    // Create a new request promise
    const requestPromise = (async () => {
      try {
        console.log('🔄 Fetching fresh users data from API')
        setLoading(true)
        
        // Load from Supabase
        const supabaseUsers = await getAllUsersWithRoles()
        const usersData = supabaseUsers.map(convertSupabaseUser)
        
        console.log('✅ Users data fetched successfully')
        
        // Update cache
        dataCache.users = usersData
        dataCache.lastFetch = now
        
        // Update state
        setUsers(usersData)
      } catch (error) {
        console.error('❌ Error loading users data:', error)
        toast({
          title: "Error",
          description: "Failed to load users data. Please try again.",
          variant: "destructive",
        })
        setUsers([])
      } finally {
        console.log('🏁 Request completed, setting loading to false')
        setLoading(false)
        setRefreshing(false)
        dataCache.currentRequest = null
      }
    })()

    // Store the request promise so other calls can wait for it
    dataCache.currentRequest = requestPromise
    
    // Wait for the request to complete
    await requestPromise
  }

  // Load initial data only once
  React.useEffect(() => {
    console.log('🚀 useEffect triggered - mounting component')
    if (!initialLoadTriggered.current) {
      console.log('🎯 First time loading - triggering data fetch')
      initialLoadTriggered.current = true
      loadUsersData(false)
    } else {
      console.log('⚠️ useEffect called again but initial load already triggered')
    }
  }, []) // Empty dependency array to run only once on mount



  const refreshData = async () => {
    setRefreshing(true)
    await loadUsersData(true) // Force refresh
    success({
      title: "Data Refreshed",
      description: "Users data has been refreshed successfully.",
    })
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRoles.includes(user.role)
    const matchesStatus = selectedStatuses.includes(user.status)
    return matchesSearch && matchesRole && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <UserCheck className="h-4 w-4 text-green-600" />
      case 'inactive':
        return <UserX className="h-4 w-4 text-gray-600" />
      case 'pending':
        return <User className="h-4 w-4 text-yellow-600" />
      case 'suspended':
        return <UserX className="h-4 w-4 text-red-600" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'inactive':
        return 'secondary'
      case 'pending':
        return 'outline'
      case 'suspended':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return '🛡️'
      case 'admin':
        return '👑'
      case 'manager':
        return '🎯'
      case 'sales':
        return '💼'
      case 'warehouse':
        return '📦'
      case 'accountant':
        return '💰'
      default:
        return '👤'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50 hover:text-red-700'
      case 'admin':
        return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50 hover:text-purple-700'
      case 'manager':
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-700'
      case 'sales':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50 hover:text-green-700'
      case 'warehouse':
        return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50 hover:text-orange-700'
      case 'accountant':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
    }
  }

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never'
    const date = new Date(lastLogin)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  const formatJoinDate = (joinDate: string) => {
    return new Date(joinDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Summary statistics
  const totalUsers = users.length
  const activeUsers = users.filter(user => user.status === 'active').length
  const adminUsers = users.filter(user => user.role === 'admin').length
  const recentLogins = users.filter(user => {
    if (!user.lastLogin) return false
    const lastLogin = new Date(user.lastLogin)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return lastLogin > oneDayAgo
  }).length

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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
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
                    <TableHead>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableHead>
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
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
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
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account with appropriate roles and permissions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="name" className="text-right">
                  Name
                </label>
                <Input 
                  id="name" 
                  name="name"
                  value={newUser.name}
                  onChange={handleNewUserChange}
                  className="col-span-3" 
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="email" className="text-right">
                  Email
                </label>
                <Input 
                  id="email" 
                  name="email"
                  type="email" 
                  value={newUser.email}
                  onChange={handleNewUserChange}
                  className="col-span-3" 
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="department" className="text-right">
                  Department
                </label>
                <Input 
                  id="department" 
                  name="department"
                  value={newUser.department}
                  onChange={handleNewUserChange}
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="role" className="text-right">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={newUser.role}
                  onChange={handleNewUserChange}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Select a role</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="sales">Sales</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="accountant">Accountant</option>
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="status" className="text-right">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={newUser.status}
                  onChange={handleNewUserChange}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Select a status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="avatar" className="text-right">
                  Avatar URL
                </label>
                <Input 
                  id="avatar" 
                  name="avatar"
                  value={newUser.avatar || ''}
                  onChange={handleNewUserChange}
                  className="col-span-3" 
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isAddingUser}>
                  {isAddingUser ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              All registered users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Currently active accounts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers}</div>
            <p className="text-xs text-muted-foreground">
              Admin level access
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Logins</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentLogins}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        {/* Role Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Roles ({selectedRoles.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {['super_admin', 'admin', 'manager', 'sales', 'warehouse', 'accountant'].map((role) => (
              <DropdownMenuCheckboxItem
                key={role}
                checked={selectedRoles.includes(role)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedRoles([...selectedRoles, role])
                  } else {
                    setSelectedRoles(selectedRoles.filter(r => r !== role))
                  }
                }}
              >
                <span className="mr-2">{getRoleIcon(role)}</span>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Status ({selectedStatuses.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {['active', 'inactive', 'pending'].map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={selectedStatuses.includes(status)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedStatuses([...selectedStatuses, status])
                  } else {
                    setSelectedStatuses(selectedStatuses.filter(s => s !== status))
                  }
                }}
              >
                {getStatusIcon(status)}
                <span className="ml-2">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
                    {getStatusIcon(selectedUser.status)}
                    <span className="ml-1">{selectedUser.status}</span>
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
                  onValueChange={(value) => setEditUser(prev => ({ ...prev, role: value }))}
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
                  onValueChange={(value) => setEditUser(prev => ({ ...prev, status: value }))}
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
          {filteredUsers.length > 0 ? (
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
        {filteredUsers.map((user) => (
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
              <Button 
                variant="ghost" 
                size="sm" 
                            className="cursor-pointer"
                onClick={() => {
                  setSelectedUser(user);
                  setIsViewDialogOpen(true);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                            className="cursor-pointer"
                onClick={() => {
                  setSelectedUser(user);
                  setEditUser({ 
                    ...user, 
                    // Ensure permissions is an array of strings if user.permissions is different
                    permissions: Array.isArray(user.permissions) ? user.permissions.map(p => typeof p === 'string' ? p : (p as any).action || String(p)) : [],
                    joinDate: user.joinDate || new Date().toISOString(), 
                    lastLogin: user.lastLogin || new Date().toISOString() 
                  });
                  setIsEditDialogOpen(true);
                }}
                disabled={
                  (currentUserRole?.toLowerCase() !== 'super_admin' && (user.role.toLowerCase() === 'super_admin' || user.role.toLowerCase() === 'administrator')) || 
                  (currentUserRole?.toLowerCase() === 'super_admin' && user.role.toLowerCase() === 'administrator')
                }
                title={
                  (currentUserRole?.toLowerCase() !== 'super_admin' && (user.role.toLowerCase() === 'super_admin' || user.role.toLowerCase() === 'administrator')) ? `Cannot edit ${user.role}` : 
                  (currentUserRole?.toLowerCase() === 'super_admin' && user.role.toLowerCase() === 'administrator') ? 'Cannot edit Administrator' : 'Edit User'
                }
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                            className="text-red-600 hover:text-red-800 cursor-pointer"
                onClick={() => {
                  setSelectedUser(user);
                  setIsDeleteDialogOpen(true);
                }}
                disabled={
                  user.id === currentUserId || 
                  user.role.toLowerCase() === 'super_admin' || 
                  user.role.toLowerCase() === 'administrator'
                }
                title={
                  user.id === currentUserId ? "You cannot delete yourself" : 
                  (user.role.toLowerCase() === 'super_admin' || user.role.toLowerCase() === 'administrator') ? `Cannot delete ${user.role}` : 'Delete User'
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
                onClick={() => {
                  setSearchTerm('')
                  setSelectedRoles(['super_admin', 'admin', 'manager', 'sales', 'warehouse', 'accountant'])
                  setSelectedStatuses(['active', 'inactive', 'pending'])
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
            </CardContent>
          </Card>
      
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