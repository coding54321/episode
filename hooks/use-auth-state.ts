'use client'

import { useState, useEffect } from 'react'
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context'

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

export interface UseAuthStateReturn {
  authState: AuthState
  user: any
  isLoading: boolean
  isAuthenticated: boolean
  isUnauthenticated: boolean
}

export function useAuthState(): UseAuthStateReturn {
  const { user, loading } = useUnifiedAuth()
  const [authState, setAuthState] = useState<AuthState>('loading')

  useEffect(() => {
    if (loading) {
      setAuthState('loading')
    } else if (user) {
      setAuthState('authenticated')
    } else {
      setAuthState('unauthenticated')
    }
  }, [user, loading])

  return {
    authState,
    user,
    isLoading: authState === 'loading',
    isAuthenticated: authState === 'authenticated',
    isUnauthenticated: authState === 'unauthenticated'
  }
}