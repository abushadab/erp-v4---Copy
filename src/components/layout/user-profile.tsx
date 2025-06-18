"use client"

import { useState } from 'react'
import Link from 'next/link'
import { User, Settings as SettingsIcon, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { toast } from 'sonner'

export function UserProfile() {
  const { user, loading, error } = useCurrentUser()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        toast.error('Failed to sign out')
        console.error('Sign out error:', error)
      } else {
        toast.success('Successfully signed out')
        // Redirect to login page
        window.location.href = '/login'
      }
    } catch (err) {
      toast.error('An error occurred while signing out')
      console.error('Sign out error:', err)
    } finally {
      setIsSigningOut(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getPrimaryRole = () => {
    if (!user?.roles || user.roles.length === 0) return 'User'
    return user.roles[0]?.name || 'User'
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center space-x-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !user) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4" />
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-muted-foreground">
            {error ? 'Error loading profile' : 'Not signed in'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="justify-start transition-colors px-2 py-2 h-11" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d4dfe1'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground mr-3">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-xs font-medium">
                  {getInitials(user.name)}
                </span>
              )}
            </div>
            <div className="text-left">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-xs text-muted-foreground">
                {getPrimaryRole()}
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              {user.department && (
                <p className="text-xs leading-none text-muted-foreground">
                  {user.department}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleSignOut} 
            className="cursor-pointer"
            disabled={isSigningOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isSigningOut ? 'Signing out...' : 'Log out'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 