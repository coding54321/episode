import { supabase } from '@/lib/supabase/client';
import { AuthError, User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '@/types';
import { SessionManager } from './session-manager';
import { AuthErrorHandler } from './auth-errors';

export interface AuthService {
  signUp(email: string, password: string, name: string): Promise<{ user: User | null; error: AuthError | null }>;
  signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }>;
  signOut(): Promise<{ error: AuthError | null }>;
  getCurrentUser(): Promise<User | null>;
  signInWithKakao(): Promise<{ user: User | null; error: AuthError | null }>;
  signInWithGoogle(): Promise<{ user: User | null; error: AuthError | null }>;
}

class SupabaseAuthService implements AuthService {
  // getCurrentUser 중복 호출 방지를 위한 플래그
  private getCurrentUserPromise: Promise<User | null> | null = null;

  private async ensureUserInPublicTable(supabaseUser: SupabaseUser, name?: string): Promise<User> {
    const provider = supabaseUser.app_metadata?.provider || 'email';

    // 이름 추출 (소셜 로그인의 경우 user_metadata에서)
    let userName = name ||
                  supabaseUser.user_metadata?.name ||
                  supabaseUser.user_metadata?.full_name ||
                  supabaseUser.user_metadata?.nickname ||
                  supabaseUser.email?.split('@')[0] ||
                  'User';

    // 이메일 추출
    let userEmail = supabaseUser.email ||
                    supabaseUser.user_metadata?.email ||
                    '';

    // public.users 테이블에 사용자가 존재하는지 확인
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    if (selectError) {
      console.error('[auth-service] ensureUserInPublicTable: 사용자 확인 에러', {
        error: selectError,
        errorCode: selectError.code,
        errorMessage: selectError.message,
        userId: supabaseUser.id,
      });
      // 에러가 발생해도 계속 진행 (새 사용자로 처리)
    }

    if (existingUser) {
      // 이미 존재하는 경우 업데이트
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          name: userName,
          email: userEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', supabaseUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('[auth-service] ensureUserInPublicTable: 사용자 업데이트 에러', {
          error: updateError,
          errorCode: updateError.code,
          errorMessage: updateError.message,
          userId: supabaseUser.id,
        });
        // 업데이트 실패해도 기존 사용자 정보 반환
      }

      const result = updatedUser || existingUser;
      return {
        id: result.id,
        name: result.name,
        email: result.email || '',
        provider: result.provider as 'kakao' | 'google' | 'email',
        createdAt: new Date(result.created_at || Date.now()).getTime(),
      };
    } else {
      // 새로운 사용자 생성
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: supabaseUser.id,
          provider: provider,
          provider_user_id: supabaseUser.id,
          name: userName,
          email: userEmail,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[auth-service] ensureUserInPublicTable: 사용자 생성 에러', {
          error: insertError,
          errorCode: insertError.code,
          errorMessage: insertError.message,
          errorDetails: insertError.details,
          errorHint: insertError.hint,
          userId: supabaseUser.id,
        });
        throw new Error(`Failed to create user in public.users table: ${insertError.message} (code: ${insertError.code})`);
      }

      if (!newUser) {
        throw new Error('Failed to create user in public.users table');
      }

      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email || '',
        provider: newUser.provider as 'kakao' | 'google' | 'email',
        createdAt: new Date(newUser.created_at || Date.now()).getTime(),
      };
    }
  }

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
        const user = await this.ensureUserInPublicTable(data.user, name);
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
        const user = await this.ensureUserInPublicTable(data.user);
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
        return await this.ensureUserInPublicTable(session.user);
      } catch (ensureError) {
        // AbortError는 조용히 무시
        if (ensureError instanceof Error && ensureError.name === 'AbortError') {
          // 세션은 있으므로 기본 사용자 정보라도 반환
          return {
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            provider: (session.user.app_metadata?.provider as 'kakao' | 'google' | 'email') || 'email',
            createdAt: new Date(session.user.created_at).getTime(),
          };
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
        return {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          provider: (session.user.app_metadata?.provider as 'kakao' | 'google' | 'email') || 'email',
          createdAt: new Date(session.user.created_at).getTime(),
        };
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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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

  async signInWithGoogle(): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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
          name: 'GoogleSignInError',
          status: 500
        } as AuthError
      };
    }
  }
}

export const authService = new SupabaseAuthService();