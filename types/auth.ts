import { AuthError as SupabaseAuthError } from '@supabase/supabase-js'
import { AuthProvider, OAuthProvider } from './index'

// 인증 상태 타입
export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

// 로그인 매개변수
export interface LoginParams {
  provider: OAuthProvider
  redirectTo?: string
  options?: {
    scopes?: string
    queryParams?: Record<string, string>
  }
}

// 회원가입 매개변수
export interface SignUpParams {
  email: string
  password: string
  name: string
  metadata?: Record<string, unknown>
}

// 로그인 매개변수 (이메일/패스워드)
export interface SignInParams {
  email: string
  password: string
}

// 인증 결과
export interface AuthResult<T = any> {
  data?: T
  error?: AuthError
}

// 사용자 세션 정보
export interface UserSession {
  user: {
    id: string
    email: string
    name: string
    provider: AuthProvider
    avatar?: string
    isVerified?: boolean
  }
  accessToken: string
  refreshToken: string
  expiresAt: number
}

// 토큰 정보
export interface TokenInfo {
  accessToken: string
  refreshToken: string
  expiresAt: number
  tokenType: 'bearer'
}

// 커스텀 인증 에러
export interface AuthError {
  code: AuthErrorCode
  message: string
  userMessage: string
  originalError?: SupabaseAuthError | Error
  status?: number
  retryable?: boolean
}

// 에러 코드
export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_NOT_CONFIRMED'
  | 'WEAK_PASSWORD'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'OAUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'SESSION_EXPIRED'
  | 'TOKEN_REFRESH_FAILED'
  | 'DATABASE_ERROR'
  | 'UNKNOWN_ERROR'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'

// 인증 컨텍스트 인터페이스
export interface AuthContextValue {
  user: UserSession['user'] | null
  session: UserSession | null
  authState: AuthState
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (params: SignInParams) => Promise<AuthResult>
  signUp: (params: SignUpParams) => Promise<AuthResult>
  signInWithOAuth: (params: LoginParams) => Promise<AuthResult>
  signOut: () => Promise<void>
  refreshSession: () => Promise<AuthResult<UserSession>>
}