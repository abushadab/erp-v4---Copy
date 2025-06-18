"use client"

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserWithPermissions } from '@/lib/supabase/users'
import type { ExtendedUser } from '@/lib/types/supabase-types'

export function useCurrentUser() {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const fetchUser = async (userId: string) => {
      // Prevent duplicate calls for the same user
      if (currentUserIdRef.current === userId && user) {
        console.log('👤 User data already loaded for:', userId)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log('👤 Fetching user data for:', userId)
        const userData = await getUserWithPermissions(userId)

        // Only update if this is still the current user
        if (currentUserIdRef.current === userId) {
          setUser(userData)
          console.log('✅ User data loaded for:', userId)
        }
      } catch (err) {
        console.error('Error fetching user data:', err)
        if (currentUserIdRef.current === userId) {
          setError('Failed to load user data')
        }
      } finally {
        if (currentUserIdRef.current === userId) {
          setLoading(false)
        }
      }
    }

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        currentUserIdRef.current = session.user.id
        await fetchUser(session.user.id)
      } else {
        currentUserIdRef.current = null
        setUser(null)
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event)

        if (session?.user) {
          const newUserId = session.user.id

          // Only fetch if it's a different user or we don't have user data
          if (currentUserIdRef.current !== newUserId || !user) {
            currentUserIdRef.current = newUserId
            await fetchUser(newUserId)
          }
        } else {
          currentUserIdRef.current = null
          setUser(null)
          setError(null)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, []) // Remove user dependency to prevent unnecessary re-runs

  return { user, loading, error }
}