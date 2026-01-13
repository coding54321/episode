'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { SessionManager } from './session-manager'
import { AuthErrorHandler, type AuthError } from './auth-errors'

// 앱에서 사용하는 User 타입
export interface AppUser {
  id: string
  name: string
  email: string
  provider: 'kakao' | 'google' | 'email'
  createdAt: number
}

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  error: AuthError | null
  signUp: (email: string, password: string, name: string) => Promise<{ error?: AuthError }>
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>
  signInWithKakao: () => Promise<{ error?: AuthError }>
  signInWithGoogle: () => Promise<{ error?: AuthError }>
  signOut: () => Promise<void>
  clearError: () => void
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * 통합 인증 컨텍스트
 * - SimpleAuthProvider의 간단함 유지
 * - ImprovedAuthProvider의 기능성 통합
 * - SessionManager를 통한 세션 관리
 * - 통일된 에러 처리
 */
export function UnifiedAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)
  const mounted = useRef(true)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Supabase User를 AppUser로 변환
  const mapSupabaseUserToAppUser = (supabaseUser: SupabaseUser): AppUser => {
    const provider = (supabaseUser.app_metadata?.provider as 'kakao' | 'google' | 'email') || 'email'
    
    // 이름 추출
    const name = 
      supabaseUser.user_metadata?.name ||
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.kakao_account?.profile?.nickname ||
      supabaseUser.user_metadata?.nickname ||
      supabaseUser.email?.split('@')[0] ||
      '사용자'

    // 이메일 추출
    const email = 
      supabaseUser.email ||
      supabaseUser.user_metadata?.kakao_account?.email ||
      supabaseUser.user_metadata?.email ||
      ''

    return {
      id: supabaseUser.id,
      name,
      email,
      provider,
      createdAt: new Date(supabaseUser.created_at).getTime(),
    }
  }

  // public.users 테이블에 사용자 동기화 (간소화된 버전)
  const ensureUserInPublicTable = async (supabaseUser: SupabaseUser): Promise<void> => {
    try {
      const appUser = mapSupabaseUserToAppUser(supabaseUser)
      
      // 사용자 존재 확인
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id' as any, supabaseUser.id as any)
        .maybeSingle()

      if (existingUser) {
        // 존재하면 업데이트
        await supabase
          .from('users')
          .update({
            name: appUser.name,
            email: appUser.email,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id' as any, supabaseUser.id as any)
      } else {
        // 없으면 생성
        await supabase
          .from('users')
          .insert({
            id: supabaseUser.id,
            provider: 'kakao',
            provider_user_id: supabaseUser.id,
            name: appUser.name,
            email: appUser.email,
          } as any)
      }
    } catch (err) {
      // 에러는 로그만 남기고 계속 진행 (사용자 경험 우선)
      console.warn('[UnifiedAuth] Failed to sync user to public.users:', err)
    }
  }

  useEffect(() => {
    mounted.current = true

    // 초기 세션 확인
    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('[UnifiedAuth] Session check error:', sessionError)
          if (mounted.current) {
            setError(AuthErrorHandler.fromSupabaseError(sessionError))
            setLoading(false)
          }
          return
        }

        if (session?.user && mounted.current) {
          const appUser = mapSupabaseUserToAppUser(session.user)
          setUser(appUser)
          
          // 백그라운드에서 users 테이블 동기화
          ensureUserInPublicTable(session.user).catch(console.error)
        }

        if (mounted.current) {
          setLoading(false)
        }
      } catch (err) {
        console.error('[UnifiedAuth] Initialization error:', err)
        if (mounted.current) {
          setError(AuthErrorHandler.fromSupabaseError(err))
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // 자동 토큰 갱신 설정
    cleanupRef.current = SessionManager.setupAutoRefresh()

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return

        try {
          if (event === 'SIGNED_IN' && session?.user) {
            const appUser = mapSupabaseUserToAppUser(session.user)
            setUser(appUser)
            setError(null)
            
            // 백그라운드에서 users 테이블 동기화
            ensureUserInPublicTable(session.user).catch(console.error)
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            // 토큰 갱신 시 사용자 정보 유지
            if (!user) {
              const appUser = mapSupabaseUserToAppUser(session.user)
              setUser(appUser)
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
            setError(null)
          }

          setLoading(false)
        } catch (err) {
          console.error('[UnifiedAuth] Auth state change error:', err)
          const authError = AuthErrorHandler.fromSupabaseError(err)
          
          if (mounted.current) {
            setError(authError)
            
            if (AuthErrorHandler.shouldLogOut(authError)) {
              setUser(null)
            }
          }
        }
      }
    )

    return () => {
      mounted.current = false
      subscription.unsubscribe()
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [])

  const signUp = async (email: string, password: string, name: string): Promise<{ error?: AuthError }> => {
    try {
      setError(null)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      })

      if (error) {
        const authError = AuthErrorHandler.fromSupabaseError(error)
        setError(authError)
        return { error: authError }
      }

      if (data.user) {
        const appUser = mapSupabaseUserToAppUser(data.user)
        if (mounted.current) {
          setUser(appUser)
        }
        await ensureUserInPublicTable(data.user)
      }

      return {}
    } catch (err) {
      const authError = AuthErrorHandler.fromSupabaseError(err)
      setError(authError)
      return { error: authError }
    }
  }

  const signIn = async (email: string, password: string): Promise<{ error?: AuthError }> => {
    try {
      setError(null)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const authError = AuthErrorHandler.fromSupabaseError(error)
        setError(authError)
        return { error: authError }
      }

      if (data.user) {
        const appUser = mapSupabaseUserToAppUser(data.user)
        if (mounted.current) {
          setUser(appUser)
        }
        await ensureUserInPublicTable(data.user)
      }

      return {}
    } catch (err) {
      const authError = AuthErrorHandler.fromSupabaseError(err)
      setError(authError)
      return { error: authError }
    }
  }

  const signInWithKakao = async (): Promise<{ error?: AuthError }> => {
    try {
      setError(null)
      
      const returnUrl = typeof window !== 'undefined' 
        ? window.location.pathname + window.location.search
        : '/mindmaps'
      
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`
        : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo,
          queryParams: {
            scope: 'profile_nickname',
          },
        },
      })

      if (error) {
        const authError = AuthErrorHandler.fromSupabaseError(error)
        setError(authError)
        return { error: authError }
      }

      return {}
    } catch (err) {
      const authError = AuthErrorHandler.fromSupabaseError(err)
      setError(authError)
      return { error: authError }
    }
  }

  const signInWithGoogle = async (): Promise<{ error?: AuthError }> => {
    try {
      setError(null)
      
      const returnUrl = typeof window !== 'undefined' 
        ? window.location.pathname + window.location.search
        : '/mindmaps'
      
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`
        : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (error) {
        const authError = AuthErrorHandler.fromSupabaseError(error)
        setError(authError)
        return { error: authError }
      }

      return {}
    } catch (err) {
      const authError = AuthErrorHandler.fromSupabaseError(err)
      setError(authError)
      return { error: authError }
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      setError(null)
      await supabase.auth.signOut()
      
      if (mounted.current) {
        setUser(null)
      }
    } catch (err) {
      const authError = AuthErrorHandler.fromSupabaseError(err)
      setError(authError)
    }
  }

  const clearError = () => {
    setError(null)
  }

  const refreshSession = async (): Promise<void> => {
    try {
      const result = await SessionManager.refreshSession()

      if (!result.success && result.error) {
        setError(result.error)

        if (AuthErrorHandler.shouldLogOut(result.error)) {
          setUser(null)
        }
      }
    } catch (err) {
      const authError = AuthErrorHandler.fromSupabaseError(err)
      setError(authError)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signInWithKakao,
    signInWithGoogle,
    signOut,
    clearError,
    refreshSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useUnifiedAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider')
  }
  return context
}

// 하위 호환성을 위한 별칭
export const AuthProvider = UnifiedAuthProvider
export const useAuth = useUnifiedAuth
