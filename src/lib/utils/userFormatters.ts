import { UserCheck, UserX, User } from 'lucide-react'

export const getRoleIcon = (role: string) => {
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

export const getRoleColor = (role: string) => {
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

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return UserCheck
    case 'inactive':
      return UserX
    case 'pending':
      return User
    case 'suspended':
      return UserX
    default:
      return User
  }
}

export const getStatusColor = (status: string) => {
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

export const formatLastLogin = (lastLogin?: string) => {
  if (!lastLogin) return 'Never'
  const date = new Date(lastLogin)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  
  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
  return date.toLocaleDateString()
}

export const formatJoinDate = (joinDate: string) => {
  const date = new Date(joinDate)
  if (isNaN(date.getTime())) return 'Invalid date'
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const formatRoleName = (role: string) => {
  return role.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

export const formatStatusName = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export const getUserInitials = (name: string) => {
  if (!name || !name.trim()) return '??'
  
  return name
    .trim()
    .split(' ')
    .filter(part => part.length > 0)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
    || '??'
} 