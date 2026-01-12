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

export interface AuthError {
  code: AuthErrorCode
  message: string
  userMessage: string
  originalError?: Error
}

export class AuthErrorHandler {
  static createError(
    code: AuthErrorCode,
    message: string,
    originalError?: Error
  ): AuthError {
    return {
      code,
      message,
      userMessage: this.getUserMessage(code),
      originalError
    }
  }

  static getUserMessage(code: AuthErrorCode): string {
    const messages: Record<AuthErrorCode, string> = {
      INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
      USER_NOT_FOUND: '등록되지 않은 이메일입니다.',
      EMAIL_NOT_CONFIRMED: '이메일 인증이 필요합니다. 메일함을 확인해주세요.',
      WEAK_PASSWORD: '더 강력한 비밀번호를 설정해주세요.',
      EMAIL_ALREADY_REGISTERED: '이미 가입된 이메일입니다.',
      OAUTH_ERROR: '소셜 로그인에 실패했습니다. 다시 시도해주세요.',
      NETWORK_ERROR: '네트워크 연결을 확인하고 다시 시도해주세요.',
      SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요.',
      TOKEN_REFRESH_FAILED: '로그인이 만료되어 자동으로 로그아웃됩니다.',
      DATABASE_ERROR: '서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다. 계속 문제가 발생하면 고객센터에 문의해주세요.'
    }

    return messages[code]
  }

  static fromSupabaseError(error: any): AuthError {
    const errorMessage = error?.message?.toLowerCase() || ''

    // 일반적인 Supabase 에러 코드 매핑
    if (error?.status === 400) {
      if (errorMessage.includes('invalid_credentials') || errorMessage.includes('invalid login')) {
        return this.createError('INVALID_CREDENTIALS', error.message, error)
      }
      if (errorMessage.includes('email not confirmed')) {
        return this.createError('EMAIL_NOT_CONFIRMED', error.message, error)
      }
      if (errorMessage.includes('weak_password')) {
        return this.createError('WEAK_PASSWORD', error.message, error)
      }
    }

    if (error?.status === 422) {
      if (errorMessage.includes('already_registered') || errorMessage.includes('user_already_exists')) {
        return this.createError('EMAIL_ALREADY_REGISTERED', error.message, error)
      }
    }

    if (error?.status === 404) {
      return this.createError('USER_NOT_FOUND', error.message, error)
    }

    if (error?.status === 401) {
      if (errorMessage.includes('session_not_found') || errorMessage.includes('expired')) {
        return this.createError('SESSION_EXPIRED', error.message, error)
      }
      return this.createError('INVALID_CREDENTIALS', error.message, error)
    }

    // OAuth 관련 에러
    if (errorMessage.includes('oauth') || errorMessage.includes('authorization')) {
      return this.createError('OAUTH_ERROR', error.message, error)
    }

    // 네트워크 에러
    if (error?.name === 'NetworkError' || error?.code === 'network_error') {
      return this.createError('NETWORK_ERROR', error.message, error)
    }

    // 데이터베이스 관련 에러
    if (error?.code?.startsWith('PGRST') || errorMessage.includes('database')) {
      return this.createError('DATABASE_ERROR', error.message, error)
    }

    // 기본 처리
    return this.createError('UNKNOWN_ERROR', error?.message || 'Unknown error', error)
  }

  static isRetryableError(error: AuthError): boolean {
    return ['NETWORK_ERROR', 'DATABASE_ERROR'].includes(error.code)
  }

  static shouldLogOut(error: AuthError): boolean {
    return ['SESSION_EXPIRED', 'TOKEN_REFRESH_FAILED'].includes(error.code)
  }
}