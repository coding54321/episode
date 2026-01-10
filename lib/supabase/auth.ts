import { supabase } from './client';
import { User } from '@/types';

/**
 * Supabase Auth를 사용한 인증 유틸리티
 */

// Supabase Auth User를 앱의 User 타입으로 변환
export function mapSupabaseUserToAppUser(supabaseUser: any): User | null {
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

  return {
    id: supabaseUser.id,
    name,
    email,
    provider: provider as 'kakao' | 'google' | 'email',
    createdAt: new Date(supabaseUser.created_at).getTime(),
  };
}

// 현재 로그인된 사용자 가져오기
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return mapSupabaseUserToAppUser(user);
  } catch (error) {
    console.error('Failed to get current user:', error);
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
        const user = mapSupabaseUserToAppUser(session.user);
        callback(user);
      } else {
        callback(null);
      }
    } else if (event === 'SIGNED_OUT') {
      callback(null);
    }
  });
}

