import { supabase } from '@/lib/supabase/client';
import { AuthError, User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '@/types';
import { SessionManager } from './session-manager';
import { AuthErrorHandler } from './auth-errors';
import { ensureUserInPublicTable } from './user-sync';
import { mapSupabaseUserToAppUser } from '@/lib/supabase/auth';

export interface AuthService {
  signUp(email: string, password: string, name: string): Promise<{ user: User | null; error: AuthError | null }>;
  signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }>;
  signOut(): Promise<{ error: AuthError | null }>;
  getCurrentUser(): Promise<User | null>;
  signInWithKakao(): Promise<{ user: User | null; error: AuthError | null }>;
}

class SupabaseAuthService implements AuthService {
  // getCurrentUser 중복 호출 방지를 위한 플래그
  private getCurrentUserPromise: Promise<User | null> | null = null;


  async signUp(email: string, password: string, name: string): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) {
        return { user: null, error };
      }

      if (data.user) {
        await ensureUserInPublicTable(data.user);
        const user = await mapSupabaseUserToAppUser(data.user);
        return { user, error: null };
      }

      return { user: null, error: null };
    } catch (err) {
      return {
        user: null,
        error: {
          message: err instanceof Error ? err.message : 'Unknown error',
          name: 'SignUpError',
          status: 500
        } as AuthError
      };
    }
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error };
      }

      if (data.user) {
        await ensureUserInPublicTable(data.user);
        const user = await mapSupabaseUserToAppUser(data.user);
        return { user, error: null };
      }

      return { user: null, error: null };
    } catch (err) {
      return {
        user: null,
        error: {
          message: err instanceof Error ? err.message : 'Unknown error',
          name: 'SignInError',
          status: 500
        } as AuthError
      };
    }
  }

  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  async getCurrentUser(): Promise<User | null> {
    // 중복 호출 방지: 이미 진행 중인 요청이 있으면 그것을 반환
    if (this.getCurrentUserPromise) {
      try {
        return await this.getCurrentUserPromise;
      } catch (error) {
        // AbortError는 조용히 무시하고 null 반환
        if (error instanceof Error && error.name === 'AbortError') {
          return null;
        }
        throw error;
      }
    }

    this.getCurrentUserPromise = this._getCurrentUser();

    try {
      const result = await this.getCurrentUserPromise;
      return result;
    } catch (error) {
      // AbortError는 조용히 무시하고 null 반환
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      throw error;
    } finally {
      // 완료 후 플래그 초기화
      this.getCurrentUserPromise = null;
    }
  }

  private async _getCurrentUser(): Promise<User | null> {
    try {
      // 세션 유효성 및 필요시 갱신 체크
      const sessionResult = await SessionManager.ensureValidSession();

      if (!sessionResult.valid) {
        if (sessionResult.error && AuthErrorHandler.shouldLogOut(sessionResult.error)) {
          await SessionManager.handleSessionExpiry();
        }
        return null;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      
      // AbortError는 조용히 무시하되, 세션이 있으면 재시도
      if (error) {
        if (error.name === 'AbortError' || (error as any)?.name === 'AbortError') {
          // AbortError 발생 시 세션을 다시 한 번 확인 (재시도)
          try {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession?.user) {
              // 세션이 있으면 기본 사용자 정보라도 반환
              return {
                id: retrySession.user.id,
                name: retrySession.user.user_metadata?.name || retrySession.user.email?.split('@')[0] || 'User',
                email: retrySession.user.email || '',
                provider: (retrySession.user.app_metadata?.provider as 'kakao' | 'google' | 'email') || 'email',
                createdAt: new Date(retrySession.user.created_at).getTime(),
              };
            }
          } catch (retryError) {
            // 재시도도 실패하면 null 반환
            return null;
          }
          return null;
        }
        console.warn('[auth-service] getCurrentUser: getSession() 에러', error);
        return null;
      }
      
      if (!session?.user) {
        // 세션이 없으면 로그인하지 않은 상태
        return null;
      }
      
      // 세션이 있으면 사용자 정보를 public.users 테이블에 등록/업데이트
      try {
        await ensureUserInPublicTable(session.user);
        return await mapSupabaseUserToAppUser(session.user);
      } catch (ensureError) {
        // AbortError는 조용히 무시
        if (ensureError instanceof Error && ensureError.name === 'AbortError') {
          // 세션은 있으므로 기본 사용자 정보라도 반환
          return await mapSupabaseUserToAppUser(session.user);
        }
        // ensureUserInPublicTable에서 발생한 에러를 상세히 로깅
        console.error('[auth-service] getCurrentUser: ensureUserInPublicTable 에러', {
          error: ensureError,
          errorName: ensureError instanceof Error ? ensureError.name : 'Unknown',
          errorMessage: ensureError instanceof Error ? ensureError.message : String(ensureError),
          errorStack: ensureError instanceof Error ? ensureError.stack : undefined,
          userId: session.user?.id,
        });
        // 에러가 발생해도 세션은 유효하므로, 기본 사용자 정보라도 반환
        return await mapSupabaseUserToAppUser(session.user);
      }
    } catch (error) {
      // AbortError는 조용히 무시하되, 세션이 있으면 재시도
      if (error instanceof Error && error.name === 'AbortError') {
        // AbortError 발생 시 세션을 다시 한 번 확인 (재시도)
        try {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession?.user) {
            // 세션이 있으면 기본 사용자 정보라도 반환
            return {
              id: retrySession.user.id,
              name: retrySession.user.user_metadata?.name || retrySession.user.email?.split('@')[0] || 'User',
              email: retrySession.user.email || '',
              provider: (retrySession.user.app_metadata?.provider as 'kakao' | 'google' | 'email') || 'email',
              createdAt: new Date(retrySession.user.created_at).getTime(),
            };
          }
        } catch (retryError) {
          // 재시도도 실패하면 null 반환
          return null;
        }
        return null;
      }
      // 다른 에러만 로깅
      console.error('[auth-service] getCurrentUser: 에러 발생', {
        error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }

  async signInWithKakao(): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const returnUrl = typeof window !== 'undefined' 
        ? window.location.pathname + window.location.search
        : '/mindmaps'
      
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`
        : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback`

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo,
          queryParams: {
            scope: 'profile_nickname',
          },
        },
      });

      if (error) {
        return { user: null, error };
      }

      return { user: null, error: null };
    } catch (err) {
      return {
        user: null,
        error: {
          message: err instanceof Error ? err.message : 'Unknown error',
          name: 'KakaoSignInError',
          status: 500
        } as AuthError
      };
    }
  }
}

export const authService = new SupabaseAuthService();