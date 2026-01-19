import { supabase } from './client';
import { User } from '@/types';
import type { Database } from './types';

// users 테이블에 사용자 등록 보장
async function ensureUserRegistered(supabaseUser: any): Promise<void> {
  if (!supabaseUser) return;

  try {
    // users 테이블에 사용자가 이미 존재하는지 확인
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    if (existingUser) return; // 이미 존재하면 종료

    // 사용자 정보 추출
    const provider = supabaseUser.app_metadata?.provider ||
                     supabaseUser.identities?.[0]?.provider ||
                     'email';

    let providerUserId = supabaseUser.id;
    if (supabaseUser.identities && supabaseUser.identities.length > 0) {
      providerUserId = supabaseUser.identities[0].id || supabaseUser.id;
    }

    let name = supabaseUser.user_metadata?.full_name ||
               supabaseUser.user_metadata?.name ||
               supabaseUser.user_metadata?.kakao_account?.profile?.nickname ||
               supabaseUser.user_metadata?.nickname ||
               supabaseUser.email?.split('@')[0] ||
               '사용자';

    let email = supabaseUser.email ||
                supabaseUser.user_metadata?.kakao_account?.email ||
                supabaseUser.user_metadata?.email ||
                '';

    // users 테이블에 사용자 등록 (upsert 사용으로 중복 처리)
    const { error } = await supabase
      .from('users')
      .upsert({
        id: supabaseUser.id,
        provider: provider,
        provider_user_id: providerUserId,
        name: name,
        email: email,
      } as any, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Failed to register user:', error);
    }
  } catch (error) {
    console.error('Error ensuring user registration:', error);
  }
}

/**
 * Supabase Auth를 사용한 인증 유틸리티
 */

// Supabase Auth User를 앱의 User 타입으로 변환
export async function mapSupabaseUserToAppUser(supabaseUser: any): Promise<User | null> {
  if (!supabaseUser) return null;

  // provider 정보 추출 (kakao, google 등)
  const provider = supabaseUser.app_metadata?.provider || 
                   supabaseUser.identities?.[0]?.provider || 
                   'email';

  // 이름 추출 (Kakao의 경우 user_metadata.kakao_account.profile.nickname)
  let name = supabaseUser.user_metadata?.full_name || 
             supabaseUser.user_metadata?.name ||
             supabaseUser.user_metadata?.kakao_account?.profile?.nickname ||
             supabaseUser.user_metadata?.nickname ||
             supabaseUser.email?.split('@')[0] || 
             '사용자';

  // 이메일 추출 (Kakao의 경우 user_metadata.kakao_account.email)
  let email = supabaseUser.email || 
              supabaseUser.user_metadata?.kakao_account?.email || 
              supabaseUser.user_metadata?.email || 
              '';

  // users 테이블에서 추가 정보 가져오기
  let jobGroup: string | null = null;
  let jobRole: string | null = null;
  let onboardingCompleted: boolean | null = null;

  try {
    const { data: userData } = await supabase
      .from('users')
      .select('job_group, job_role, onboarding_completed')
      .eq('id' as any, supabaseUser.id as any)
      .maybeSingle();

    if (userData) {
      jobGroup = userData.job_group as string | null;
      jobRole = userData.job_role as string | null;
      onboardingCompleted = userData.onboarding_completed as boolean | null;
    }
  } catch (error) {
    console.warn('Failed to fetch additional user data:', error);
    // 에러가 있어도 기본 정보는 반환
  }

  return {
    id: supabaseUser.id,
    name,
    email,
    provider: provider as 'kakao' | 'google' | 'email',
    createdAt: new Date(supabaseUser.created_at).getTime(),
    jobGroup,
    jobRole,
    onboardingCompleted: onboardingCompleted ?? false,
  };
}

// 현재 로그인된 사용자 가져오기 (Supabase Auth만 사용)
export async function getCurrentUserWithRegistration(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Supabase Auth 사용자를 앱 User 타입으로 변환만 함
    return await mapSupabaseUserToAppUser(user);
  } catch (error) {
    console.warn('Failed to get current user:', error);
    return null;
  }
}

// 사용자 등록 함수 (외부에서도 사용 가능)
export async function registerCurrentUser(): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return false;
    }

    await ensureUserRegistered(user);
    return true;
  } catch (error) {
    console.error('Failed to register current user:', error);
    return false;
  }
}

// 현재 로그인된 사용자 가져오기 (기존 함수 유지)
export async function getCurrentUser(): Promise<User | null> {
  console.log('[supabase/auth] getCurrentUser: 시작');
  try {
    console.log('[supabase/auth] getCurrentUser: supabase.auth.getUser() 호출 전');
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('[supabase/auth] getCurrentUser: supabase.auth.getUser() 완료', { 
      hasUser: !!user, 
      hasError: !!error,
      errorName: error?.name,
      errorMessage: error?.message 
    });

    if (error || !user) {
      console.log('[supabase/auth] getCurrentUser: 사용자 없음 또는 에러', { error });
      return null;
    }

    const result = await mapSupabaseUserToAppUser(user);
    console.log('[supabase/auth] getCurrentUser: 완료', { userId: result?.id });
    return result;
  } catch (error) {
    console.error('[supabase/auth] getCurrentUser: 에러 발생', {
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      isAbortError: error instanceof Error && error.name === 'AbortError'
    });
    // AbortError는 조용히 무시 (컴포넌트 언마운트 등으로 인한 정상적인 중단)
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[supabase/auth] getCurrentUser: AbortError 무시 (정상적인 중단)');
      return null;
    }
    // 다른 에러만 로깅 (너무 자주 호출되는 경우를 위해 경고로 변경)
    console.warn('[supabase/auth] getCurrentUser: 실패', error);
    return null;
  }
}

// 세션 확인
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Failed to get session:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

// 로그아웃
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Failed to sign out:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to sign out:', error);
    return false;
  }
}

// Auth 상태 변경 감지
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (session?.user) {
        const user = await mapSupabaseUserToAppUser(session.user);
        callback(user);
      } else {
        callback(null);
      }
    } else if (event === 'SIGNED_OUT') {
      callback(null);
    }
  });
}

