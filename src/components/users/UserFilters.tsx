'use client'

import * as React from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu"
import { Search, Filter } from "lucide-react"
import { useUserFilters } from '@/hooks/users'
import { getRoleIcon, getStatusIcon } from '@/lib/utils/userFormatters'
import { formatRoleName, formatStatusName } from '@/lib/utils/userFormatters'

interface UserFiltersProps {
  searchTerm: string
  selectedRoles: string[]
  selectedStatuses: string[]
  onSearchChange: (search: string) => void
  onRoleToggle: (role: string) => void
  onStatusToggle: (status: string) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function UserFilters({
  searchTerm,
  selectedRoles,
  selectedStatuses,
  onSearchChange,
  onRoleToggle,
  onStatusToggle,
  onClearFilters,
  hasActiveFilters
}: UserFiltersProps) {
  const { availableRoles, availableStatuses } = useUserFilters()

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name, email, or department..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
          suppressHydrationWarning
        />
      </div>
      
      {/* Role Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" suppressHydrationWarning>
            <Filter className="mr-2 h-4 w-4" />
            Roles ({selectedRoles.length})
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableRoles.map((role) => (
            <DropdownMenuCheckboxItem
              key={role}
              checked={selectedRoles.includes(role)}
              onCheckedChange={() => onRoleToggle(role)}
            >
              <span className="mr-2">{getRoleIcon(role)}</span>
              {formatRoleName(role)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" suppressHydrationWarning>
            <Filter className="mr-2 h-4 w-4" />
            Status ({selectedStatuses.length})
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableStatuses.map((status) => {
            const StatusIcon = getStatusIcon(status)
            return (
              <DropdownMenuCheckboxItem
                key={status}
                checked={selectedStatuses.includes(status)}
                onCheckedChange={() => onStatusToggle(status)}
              >
                <StatusIcon className="mr-2 h-4 w-4" />
                {formatStatusName(status)}
              </DropdownMenuCheckboxItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          onClick={onClearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          Clear Filters
        </Button>
      )}
    </div>
  )
} 