/**
 * 사용자 동기화 유틸리티
 * public.users 테이블과 Supabase Auth 사용자 정보를 동기화
 */

import { supabase } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { AppUser } from './unified-auth-context';

/**
 * Supabase User를 AppUser로 변환
 */
export async function mapSupabaseUserToAppUser(supabaseUser: SupabaseUser): Promise<AppUser> {
  // 카카오 로그인만 지원하므로 항상 'kakao'로 설정
  const provider: 'kakao' = 'kakao';
  
  // 이름 추출
  const name = 
    supabaseUser.user_metadata?.name ||
    supabaseUser.user_metadata?.full_name ||
    supabaseUser.user_metadata?.kakao_account?.profile?.nickname ||
    supabaseUser.user_metadata?.nickname ||
    supabaseUser.email?.split('@')[0] ||
    '사용자';

  // 이메일 추출
  const email = 
    supabaseUser.email ||
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
  }

  return {
    id: supabaseUser.id,
    name,
    email,
    provider,
    createdAt: new Date(supabaseUser.created_at).getTime(),
    jobGroup,
    jobRole,
    onboardingCompleted: onboardingCompleted ?? false,
  };
}

/**
 * public.users 테이블에 사용자 동기화 (upsert)
 * - 사용자가 존재하면 업데이트
 * - 존재하지 않으면 생성
 */
export async function ensureUserInPublicTable(supabaseUser: SupabaseUser): Promise<void> {
  try {
    const appUser = await mapSupabaseUserToAppUser(supabaseUser);
    
    // Provider 정보 추출
    const provider = appUser.provider;
    
    // Provider User ID 추출
    let providerUserId = supabaseUser.id;
    if (supabaseUser.identities && supabaseUser.identities.length > 0) {
      providerUserId = supabaseUser.identities[0].id || supabaseUser.id;
    }
    
    // 사용자 존재 확인
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id' as any, supabaseUser.id as any)
      .maybeSingle();

    if (existingUser) {
      // 존재하면 업데이트 (job_group, job_role, onboarding_completed은 유지)
      await supabase
        .from('users')
        .update({
          name: appUser.name,
          email: appUser.email,
          provider: provider,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id' as any, supabaseUser.id as any);
    } else {
      // 없으면 생성
      await supabase
        .from('users')
        .insert({
          id: supabaseUser.id,
          provider: provider,
          provider_user_id: providerUserId,
          name: appUser.name,
          email: appUser.email,
        } as any);
    }
  } catch (err) {
    // 에러는 로그만 남기고 계속 진행 (사용자 경험 우선)
    console.warn('[user-sync] Failed to sync user to public.users:', err);
  }
}
