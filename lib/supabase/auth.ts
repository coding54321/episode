import { supabase } from './client';
import { User } from '@/types';
import type { Database } from './types';
import { mapSupabaseUserToAppUser as mapToAppUser, ensureUserInPublicTable } from '@/lib/auth/user-sync';

// users 테이블에 사용자 등록 보장 (하위 호환성을 위한 래퍼)
async function ensureUserRegistered(supabaseUser: any): Promise<void> {
  if (!supabaseUser) return;
  await ensureUserInPublicTable(supabaseUser);
}

/**
 * Supabase Auth를 사용한 인증 유틸리티
 */

// Supabase Auth User를 앱의 User 타입으로 변환 (하위 호환성을 위한 래퍼)
export async function mapSupabaseUserToAppUser(supabaseUser: any): Promise<User | null> {
  if (!supabaseUser) return null;
  const appUser = await mapToAppUser(supabaseUser);
  // AppUser를 User 타입으로 변환 (null을 undefined로 변환)
  return {
    id: appUser.id,
    name: appUser.name,
    email: appUser.email,
    provider: appUser.provider,
    createdAt: appUser.createdAt,
    jobGroup: appUser.jobGroup ?? undefined,
    jobRole: appUser.jobRole ?? undefined,
    onboardingCompleted: appUser.onboardingCompleted ?? false,
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

