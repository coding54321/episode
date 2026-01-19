import { supabase } from '@/lib/supabase/client'
import { AuthError, AuthErrorHandler } from './auth-errors'

export interface SessionInfo {
  isValid: boolean
  expiresAt?: number
  needsRefresh?: boolean
  user?: any
}

export class SessionManager {
  private static refreshPromise: Promise<any> | null = null
  private static lastRefreshTime = 0
  private static readonly REFRESH_THRESHOLD = 5 * 60 * 1000 // 5분 전에 갱신
  private static readonly MIN_REFRESH_INTERVAL = 30 * 1000 // 최소 30초 간격

  static async checkSession(): Promise<SessionInfo> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.warn('Session check error:', error)
        return { isValid: false }
      }

      if (!session) {
        return { isValid: false }
      }

      const now = Date.now()
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
      const needsRefresh = now > (expiresAt - this.REFRESH_THRESHOLD)

      return {
        isValid: true,
        expiresAt,
        needsRefresh,
        user: session.user
      }
    } catch (error) {
      console.error('Session check failed:', error)
      return { isValid: false }
    }
  }

  static async refreshSession(): Promise<{ success: boolean; error?: AuthError }> {
    const now = Date.now()

    // 너무 자주 갱신하지 않도록 제한
    if (now - this.lastRefreshTime < this.MIN_REFRESH_INTERVAL) {
      return { success: true }
    }

    // 이미 갱신 중인 경우 해당 Promise 반환
    if (this.refreshPromise) {
      try {
        await this.refreshPromise
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: AuthErrorHandler.createError('TOKEN_REFRESH_FAILED', 'Failed to refresh token')
        }
      }
    }

    this.refreshPromise = this._performRefresh()

    try {
      await this.refreshPromise
      this.lastRefreshTime = now
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: AuthErrorHandler.fromSupabaseError(error)
      }
    } finally {
      this.refreshPromise = null
    }
  }

  private static async _performRefresh(): Promise<void> {
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      console.error('Token refresh failed:', error)
      throw error
    }

    if (!data.session) {
      throw new Error('No session after refresh')
    }
  }

  static async ensureValidSession(): Promise<{ valid: boolean; error?: AuthError }> {
    const sessionInfo = await this.checkSession()

    if (!sessionInfo.isValid) {
      return { valid: false }
    }

    if (sessionInfo.needsRefresh) {
      const refreshResult = await this.refreshSession()

      if (!refreshResult.success) {
        return { valid: false, error: refreshResult.error }
      }
    }

    return { valid: true }
  }

  static async handleSessionExpiry(): Promise<void> {
    try {
      // 로컬 스토리지 정리
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb-auth-token')
        localStorage.removeItem('supabase.auth.token')
      }

      // Supabase 세션 정리
      await supabase.auth.signOut({ scope: 'local' })
    } catch (error) {
      console.error('Error during session cleanup:', error)
    }
  }

  static setupAutoRefresh(): () => void {
    let consecutiveFailures = 0
    const MAX_CONSECUTIVE_FAILURES = 3

    const interval = setInterval(async () => {
      const sessionInfo = await this.checkSession()

      if (sessionInfo.isValid && sessionInfo.needsRefresh) {
        const refreshResult = await this.refreshSession()

        if (!refreshResult.success) {
          consecutiveFailures++
          console.warn(`Auto refresh failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, refreshResult.error)

          // 네트워크 오류인 경우 재시도
          if (refreshResult.error?.code === 'NETWORK_ERROR' && consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
            return // 재시도 대기
          }

          // 연속 실패 또는 토큰 갱신 실패 시 사용자에게 경고 후 로그아웃
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES || 
              refreshResult.error?.code === 'TOKEN_REFRESH_FAILED' ||
              refreshResult.error?.code === 'SESSION_EXPIRED') {
            
            // 사용자에게 경고 표시 (토스트 메시지)
            if (typeof window !== 'undefined') {
              // 토스트 라이브러리가 있다면 사용, 없으면 alert
              const showWarning = () => {
                const event = new CustomEvent('session-expiring', {
                  detail: { message: '세션이 만료되어 로그아웃됩니다.' }
                })
                window.dispatchEvent(event)
              }
              
              showWarning()
              
              // 2초 후 로그아웃
              setTimeout(async () => {
                await this.handleSessionExpiry()
                window.location.href = '/login?error=session_expired'
              }, 2000)
            } else {
              await this.handleSessionExpiry()
            }
          }
        } else {
          // 성공 시 실패 카운터 리셋
          consecutiveFailures = 0
        }
      }
    }, 60 * 1000) // 1분마다 체크

    return () => clearInterval(interval)
  }

  static async validateTokenIntegrity(): Promise<boolean> {
    try {
      // 현재 세션의 사용자 정보 조회 시도
      const { data, error } = await supabase.auth.getUser()

      if (error || !data.user) {
        return false
      }

      return true
    } catch (error) {
      console.error('Token integrity check failed:', error)
      return false
    }
  }
}