"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserWithPermissions } from '@/lib/supabase/users'
import type { ExtendedUser } from '@/lib/types/supabase-types'

export function useCurrentUser() {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const fetchUser = async (userId: string) => {
      try {
        setLoading(true)
        setError(null)
        
        const userData = await getUserWithPermissions(userId)
        setUser(userData)
      } catch (err) {
        console.error('Error fetching user data:', err)
        setError('Failed to load user data')
      } finally {
        setLoading(false)
      }
    }

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchUser(session.user.id)
      } else {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchUser(session.user.id)
        } else {
          setUser(null)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading, error }
} 